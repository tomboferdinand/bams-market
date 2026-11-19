import { BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { GoalpayPayoutProvider, describeShape, readProviderStatus } from './goalpay-payout.provider';

// Faux client GoalPay : AUCUN appel réseau réel. Chaque réponse est programmée par le test.
type Reply = { status: number; body?: unknown } | Error;

function fakeHttp(...replies: Reply[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const http = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = replies.shift();
    if (!next) throw new Error('appel inattendu');
    if (next instanceof Error) throw next;
    return {
      status: next.status,
      json: async () => {
        if (next.body === undefined) throw new Error('pas de JSON');
        return next.body;
      },
    } as Response;
  });
  return { http, calls };
}

const KEY = 'TGP_TEST_TOKEN';
const SECRET = 'SK_TEST_SECRET';

describe('GoalpayPayoutProvider (faux client)', () => {
  const original = { ...process.env };
  let warn: jest.SpyInstance;

  beforeEach(() => {
    process.env.GOALPAY_ACCESS_KEY = KEY;
    process.env.GOALPAY_WEBHOOK_SECRET = SECRET;
    process.env.GOALPAY_API_URL = 'https://api.goalpay.test';
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined); // journaux silencieux
  });
  afterEach(() => {
    process.env = { ...original };
    warn.mockRestore();
  });

  const logs = (provider: GoalpayPayoutProvider) => {
    const spy = jest.spyOn((provider as any).logger, 'warn').mockImplementation(() => undefined);
    return spy;
  };

  describe('authentification', () => {
    it('en-têtes : jeton = GOALPAY_ACCESS_KEY, signature = HMAC-SHA256(secret, secret)', async () => {
      const { http, calls } = fakeHttp({ status: 201, body: {} });
      await new GoalpayPayoutProvider(http).ensureWhitelisted('0341234567', 'Jean Dupont', 500000);
      const headers = calls[0].init.headers as Record<string, string>;
      expect(headers['x-gpay-token']).toBe(KEY);
      expect(headers['x-gpay-signature']).toBe(createHmac('sha256', SECRET).update(SECRET).digest('hex'));
      expect(calls[0].url).toBe('https://api.goalpay.test/api/access/sites/withdraw-white-list');
      expect(JSON.parse(calls[0].init.body as string)).toEqual({ mobile: '0341234567', max_amount: 500000, owner_name: 'Jean Dupont' });
    });

    it('sans clés : aucun appel, erreur claire', async () => {
      delete process.env.GOALPAY_ACCESS_KEY;
      const { http } = fakeHttp();
      await expect(new GoalpayPayoutProvider(http).preview('0341234567', 5000)).rejects.toThrow(ServiceUnavailableException);
      expect(http).not.toHaveBeenCalled();
    });
  });

  describe('liste blanche', () => {
    it('« déjà présent » compte comme un succès (vérifié par GET), puis plus aucun appel', async () => {
      const { http, calls } = fakeHttp({ status: 409, body: { message: 'Mobile already exists' } }, { status: 200, body: { mobile: '0341234567' } });
      const p = new GoalpayPayoutProvider(http);
      await p.ensureWhitelisted('0341234567', 'Jean Dupont', 500000);
      expect(calls[1].init.method).toBe('GET');
      expect(calls[1].url).toContain('/withdraw-white-list/0341234567');
      await p.ensureWhitelisted('0341234567', 'Jean Dupont', 500000); // en cache
      expect(http).toHaveBeenCalledTimes(2);
    });

    it('refus réel : erreur avec le message GoalPay, structure journalisée sans valeur', async () => {
      const p = new GoalpayPayoutProvider(fakeHttp({ status: 400, body: { message: 'Numéro invalide', token: 'NE_PAS_JOURNALISER' } }, { status: 404, body: {} }).http);
      const spy = logs(p);
      await expect(p.ensureWhitelisted('0341234567', 'Jean', 1)).rejects.toThrow(/Numéro invalide/);
      const logged = spy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(logged).toContain('"token":"string"');
      expect(logged).not.toContain('NE_PAS_JOURNALISER');
      expect(logged).not.toContain(KEY);
      expect(logged).not.toContain(SECRET);
    });

    it('suppression : 200 et 404 acceptés, autre réponse = erreur', async () => {
      const { http, calls } = fakeHttp({ status: 200, body: {} }, { status: 404 }, { status: 500 });
      const p = new GoalpayPayoutProvider(http);
      logs(p);
      await p.removeFromWhitelist('0341234567');
      expect(calls[0].init.method).toBe('DELETE');
      await p.removeFromWhitelist('0341234567');
      await expect(p.removeFromWhitelist('0341234567')).rejects.toThrow();
    });
  });

  describe('aperçu', () => {
    it('frais réels : débit = total_debite, frais = total_debite − montant', async () => {
      const { http, calls } = fakeHttp({ status: 200, body: { frais_total: 1000, total_debite: 26000 } });
      const res = await new GoalpayPayoutProvider(http).preview('0341234567', 25000);
      expect(res).toEqual({ fees: 1000, totalDebited: 26000 });
      expect(calls[0].url).toContain('/withdraw-white-list/0341234567/withdraw/preview');
      expect(JSON.parse(calls[0].init.body as string)).toEqual({ amount: 25000 });
    });

    it('réponse sous « data » et frais seuls acceptés', async () => {
      const p = new GoalpayPayoutProvider(fakeHttp({ status: 200, body: { data: { frais_total: 300 } } }).http);
      expect(await p.preview('0341234567', 5000)).toEqual({ fees: 300, totalDebited: 5300 });
    });

    it('refus de l’opérateur (4xx) : message clair', async () => {
      const p = new GoalpayPayoutProvider(fakeHttp({ status: 422, body: { message: 'Montant inférieur au minimum opérateur' } }).http);
      await expect(p.preview('0341234567', 100)).rejects.toThrow(BadRequestException);
    });

    it('réponse non reconnue ou panne : refus prudent, aucun retrait possible', async () => {
      const p = new GoalpayPayoutProvider(fakeHttp({ status: 200, body: { autre: 1 } }, new Error('timeout')).http);
      logs(p);
      await expect(p.preview('0341234567', 5000)).rejects.toThrow(ServiceUnavailableException);
      await expect(p.preview('0341234567', 5000)).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('retrait', () => {
    const input = { phone: '0341234567', amount: 25000, reference: 'BAMP-ABC' };

    it('envoie montant et NOTRE référence ; 2xx sans statut final = en attente (webhook)', async () => {
      const { http, calls } = fakeHttp({ status: 200, body: { message: 'Retrait en cours' } });
      const p = new GoalpayPayoutProvider(http);
      logs(p);
      expect(await p.withdraw(input)).toEqual({ status: 'pending' });
      expect(JSON.parse(calls[0].init.body as string)).toEqual({ amount: 25000, reference: 'BAMP-ABC' });
      expect(calls[0].url).toContain('/withdraw-white-list/0341234567/withdraw');
    });

    it('4xx définitif : échec (le service recrédite)', async () => {
      const p = new GoalpayPayoutProvider(fakeHttp({ status: 400, body: { message: 'Solde marchand insuffisant' } }).http);
      expect(await p.withdraw(input)).toEqual({ status: 'failed', error: 'Retrait refusé par l’opérateur : Solde marchand insuffisant' });
    });

    it('5xx, 409, 429 : en attente (l’argent est peut-être parti)', async () => {
      const p = new GoalpayPayoutProvider(fakeHttp({ status: 502 }, { status: 409, body: {} }, { status: 429, body: {} }).http);
      logs(p);
      expect(await p.withdraw(input)).toEqual({ status: 'pending' });
      expect(await p.withdraw(input)).toEqual({ status: 'pending' });
      expect(await p.withdraw(input)).toEqual({ status: 'pending' });
    });

    it('délai dépassé : l’erreur remonte (le service laisse en attente)', async () => {
      const p = new GoalpayPayoutProvider(fakeHttp(new Error('The operation was aborted due to timeout')).http);
      await expect(p.withdraw(input)).rejects.toThrow(/timeout/);
    });
  });

  describe('statut (rattrapage)', () => {
    it('GET withdraw-status/{notre référence} ; succès avec montant et référence opérateur', async () => {
      const { http, calls } = fakeHttp({ status: 200, body: { status: 'success', data: { montant: 200.0, reference_operateur: 'PP26' } } });
      const res = await new GoalpayPayoutProvider(http).getStatus('BAMP-ABC');
      expect(calls[0].url).toBe('https://api.goalpay.test/api/access/sites/withdraw-status/BAMP-ABC');
      expect(res).toEqual({ status: 'success', amount: 200, providerReference: 'PP26', error: undefined });
    });

    it('échec reconnu, inconnu = en attente, erreur HTTP = en attente', async () => {
      const p = new GoalpayPayoutProvider(fakeHttp(
        { status: 200, body: { status: 'failed', error: 'Numéro invalide' } },
        { status: 200, body: { etat: 'X' } },
        { status: 500 },
      ).http);
      logs(p);
      expect((await p.getStatus('R')).status).toBe('failed');
      expect(await p.getStatus('R')).toEqual({ status: 'pending' });
      expect(await p.getStatus('R')).toEqual({ status: 'pending' });
    });
  });

  it('outils : statut lisible et structure sans valeur', () => {
    expect(readProviderStatus({ event: 'withdrawal.success' })).toBe('success');
    expect(readProviderStatus({ data: { status: 'FAILED' } })).toBe('failed');
    expect(readProviderStatus({ status: 'processing' })).toBe('pending');
    expect(readProviderStatus({})).toBe('unknown');
    expect(describeShape({ a: 1, b: { c: 'x', d: null }, e: [{ f: true }] })).toEqual({ a: 'number', b: { c: 'string', d: 'null' }, e: [{ f: 'boolean' }] });
  });
});
