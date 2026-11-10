import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentsService } from './payments.service';
import { GoalpayClient } from './goalpay.client';
import { diagnoseSignature, verifyWebhookSignature } from './goalpay-signature';
import { makeAuditMock, makePrismaMock } from '../common/testing/mocks';

const SECRET = 'SK_TEST_SECRET';
const sign = (data: string) => createHmac('sha256', SECRET).update(data, 'utf8').digest('hex');
const SIG = sign(SECRET); // signature documentée par GoalPay

describe('Signature des webhooks GoalPay', () => {
  it('accepte la signature documentée (HMAC du secret)', () => {
    expect(verifyWebhookSignature(SECRET, SIG, { a: 1 })).toBe(true);
  });
  it('accepte aussi le HMAC du corps JSON', () => {
    const body = { event: 'payment.success' };
    expect(verifyWebhookSignature(SECRET, sign(JSON.stringify(body)), body)).toBe(true);
    expect(diagnoseSignature(SECRET, sign(JSON.stringify(body)), body)).toEqual({ matchesSecretOnly: false, matchesBody: true });
  });
  it('refuse une signature absente, fausse, ou un secret vide', () => {
    expect(verifyWebhookSignature(SECRET, undefined, {})).toBe(false);
    expect(verifyWebhookSignature(SECRET, 'abc', {})).toBe(false);
    expect(verifyWebhookSignature(SECRET, sign('autre'), {})).toBe(false);
    expect(verifyWebhookSignature('', SIG, {})).toBe(false);
  });
});

describe('GoalpayClient', () => {
  const original = { ...process.env };
  const realFetch = global.fetch;
  afterEach(() => {
    process.env = { ...original };
    global.fetch = realFetch;
  });
  const input = { description: 'Commande #5', reference: 'BAM-5-AB', amount: 17000, items: [{ label: 'Riz', unit_price: 15000, quantity: 1 }] };

  it('envoie le jeton dans le corps, devise Ar, et lit la réponse', async () => {
    process.env.GOALPAY_ACCESS_KEY = 'TGPT_SECRETTOKEN';
    process.env.GOALPAY_API_URL = 'https://goalpay.test/api/payement/service';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ message: 'Success', data: { checkout_url: 'https://goalpay.pro/c/1', expires_in_minutes: 10, order_reference: 'REF_1' } }),
    });
    global.fetch = fetchMock as any;
    const res = await new GoalpayClient().createCheckout(input);
    expect(res).toEqual({ checkoutUrl: 'https://goalpay.pro/c/1', expiresInMinutes: 10, orderReference: 'REF_1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://goalpay.test/api/payement/service');
    expect(JSON.parse(init.body)).toEqual({
      description: 'Commande #5', access: 'TGPT_SECRETTOKEN', reference: 'BAM-5-AB',
      amount: 17000, currency: 'Ar', metadata: input.items,
    });
  });

  it('réponse inattendue : 502 sans divulguer le jeton', async () => {
    process.env.GOALPAY_ACCESS_KEY = 'TGPT_SECRETTOKEN';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Token invalide' }) }) as any;
    const err: any = await new GoalpayClient().createCheckout(input).catch((e) => e);
    expect(err).toBeInstanceOf(BadGatewayException);
    expect(JSON.stringify(err.getResponse())).not.toContain('TGPT_SECRETTOKEN');
  });

  it('réseau en panne : 502', async () => {
    process.env.GOALPAY_ACCESS_KEY = 'TGPT_X';
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNRESET')) as any;
    await expect(new GoalpayClient().createCheckout(input)).rejects.toThrow(BadGatewayException);
  });

  it('isConfigured dépend de GOALPAY_ACCESS_KEY', () => {
    delete process.env.GOALPAY_ACCESS_KEY;
    expect(new GoalpayClient().isConfigured()).toBe(false);
    process.env.GOALPAY_ACCESS_KEY = 'TGPT_X';
    expect(new GoalpayClient().isConfigured()).toBe(true);
  });
});

describe('PaymentsService – GoalPay', () => {
  let prisma: any, audit: any, goalpay: any, service: PaymentsService;
  const original = { ...process.env };

  beforeEach(() => {
    process.env.PAYMENT_MODE = 'goalpay';
    process.env.GOALPAY_ACCESS_KEY = 'TGPT_X';
    process.env.GOALPAY_WEBHOOK_SECRET = SECRET;
    prisma = makePrismaMock();
    audit = makeAuditMock();
    goalpay = { isConfigured: jest.fn().mockReturnValue(true), createCheckout: jest.fn() };
    service = new PaymentsService(prisma, audit, goalpay);
  });
  afterEach(() => {
    process.env = { ...original };
  });

  describe('initiate', () => {
    const order = (over: any = {}) => ({
      id: 5, userId: 1, status: 'EN_ATTENTE_PAIEMENT', total: 17000, subtotal: 15000, deliveryFee: 2000, payment: null,
      items: [{ unitPrice: 15000, quantity: 1, product: { name: 'Riz' } }], ...over,
    });

    it('refuse (503) sans GOALPAY_ACCESS_KEY, sans rien lire ni appeler', async () => {
      goalpay.isConfigured.mockReturnValue(false);
      await expect(service.initiate(1, 5)).rejects.toThrow(ServiceUnavailableException);
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
      expect(goalpay.createCheckout).not.toHaveBeenCalled();
    });

    it('crée la commande de paiement GoalPay avec le montant officiel et enregistre les références', async () => {
      prisma.order.findUnique.mockResolvedValue(order());
      goalpay.createCheckout.mockResolvedValue({ checkoutUrl: 'https://goalpay.pro/c/1', expiresInMinutes: 10, orderReference: 'REF_9' });
      prisma.payment.upsert.mockImplementation(async ({ create }: any) => ({ id: 1, ...create }));

      const payment = await service.initiate(1, 5);

      const call = goalpay.createCheckout.mock.calls[0][0];
      expect(call.amount).toBe(17000);
      expect(call.reference).toMatch(/^BAM-5-[0-9A-F]{8}$/);
      expect(call.items).toEqual([
        { label: 'Riz', unit_price: 15000, quantity: 1 },
        { label: 'Frais de livraison', unit_price: 2000, quantity: 1 },
      ]);
      expect(payment).toMatchObject({
        orderId: 5, amount: 17000, externalReference: 'REF_9', checkoutUrl: 'https://goalpay.pro/c/1', status: 'EN_ATTENTE',
        merchantReference: call.reference,
      });
      expect(payment.expiresAt.getTime()).toBeGreaterThan(Date.now() + 10 * 60 * 1000); // marge webhook
    });

    it('réutilise le paiement en attente encore valide, sans nouvel appel GoalPay (BR-PAY-05)', async () => {
      const pending = { id: 1, status: 'EN_ATTENTE', expiresAt: new Date(Date.now() + 60_000), checkoutUrl: 'https://goalpay.pro/c/1' };
      prisma.order.findUnique.mockResolvedValue(order({ payment: pending }));
      expect(await service.initiate(1, 5)).toBe(pending);
      expect(goalpay.createCheckout).not.toHaveBeenCalled();
    });

    it("si GoalPay échoue, rien n'est enregistré", async () => {
      prisma.order.findUnique.mockResolvedValue(order());
      goalpay.createCheckout.mockRejectedValue(new BadGatewayException('indisponible'));
      await expect(service.initiate(1, 5)).rejects.toThrow(BadGatewayException);
      expect(prisma.payment.upsert).not.toHaveBeenCalled();
    });
  });

  describe('webhook', () => {
    const payment = (over: any = {}) => ({
      id: 3, orderId: 5, status: 'EN_ATTENTE', amount: 17000, externalReference: 'REF_9', merchantReference: 'BAM-5-AB12CD34', ...over,
    });
    const body = (event: string, over: any = {}) => ({
      event, data: { order_reference: 'REF_9', reference: 'BAM-5-AB12CD34', amount: 17000, currency: 'Ar', ...over },
    });
    const arm = () => {
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.order.updateMany.mockResolvedValue({ count: 1 });
      prisma.orderItem.findMany.mockResolvedValue([{ productId: 4, quantity: 2 }]);
      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findUnique.mockResolvedValue(payment());
    };

    it('503 si le secret du webhook est absent', async () => {
      delete process.env.GOALPAY_WEBHOOK_SECRET;
      await expect(service.handleGoalpayWebhook(SIG, body('payment.success'))).rejects.toThrow(ServiceUnavailableException);
    });

    it('401 si la signature est fausse, sans toucher à la base', async () => {
      await expect(service.handleGoalpayWebhook('mauvaise', body('payment.success'))).rejects.toThrow(UnauthorizedException);
      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('400 si la notification est incomplète', async () => {
      await expect(service.handleGoalpayWebhook(SIG, { event: 'payment.success' })).rejects.toThrow(BadRequestException);
    });

    it('404 si la référence est inconnue (GoalPay réessaiera)', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.handleGoalpayWebhook(SIG, body('payment.success'))).rejects.toThrow(NotFoundException);
    });

    it('payment.success : paiement VALIDEE, commande PAYEE, audit système', async () => {
      arm();
      const res = await service.handleGoalpayWebhook(SIG, body('payment.success'));
      expect(res).toEqual({ received: true, status: 'VALIDEE' });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({ where: { id: 3, status: 'EN_ATTENTE' }, data: { status: 'VALIDEE' } });
      expect(prisma.order.updateMany).toHaveBeenCalledWith({ where: { id: 5, status: 'EN_ATTENTE_PAIEMENT' }, data: { status: 'PAYEE' } });
      expect(prisma.product.updateMany).not.toHaveBeenCalled(); // pas de restitution de stock
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ entityId: 3, previousValue: 'EN_ATTENTE', newValue: 'VALIDEE' }));
    });

    it('montant différent : jamais validé, anomalie journalisée', async () => {
      arm();
      const res = await service.handleGoalpayWebhook(SIG, body('payment.success', { amount: 100 }));
      expect(res).toEqual({ received: true, status: 'ignored' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ newValue: 'ANOMALIE_MONTANT' }));
    });

    it('référence GoalPay différente : ignoré et journalisé', async () => {
      arm();
      const res = await service.handleGoalpayWebhook(SIG, body('payment.success', { order_reference: 'REF_AUTRE' }));
      expect(res.status).toBe('ignored');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('webhook rejoué : idempotent, rien n’est retraité', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment({ status: 'VALIDEE' }));
      const res = await service.handleGoalpayWebhook(SIG, body('payment.success'));
      expect(res.status).toBe('already-processed');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('succès reçu après expiration : signalé « à rembourser », la commande n’est pas rouverte', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment({ status: 'EXPIREE' }));
      const res = await service.handleGoalpayWebhook(SIG, body('payment.success'));
      expect(res.status).toBe('already-processed');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ newValue: 'CONFIRMATION_TARDIVE_A_REMBOURSER' }));
    });

    it("succès alors que la commande n'est plus payable : signalé « à rembourser »", async () => {
      prisma.payment.findUnique.mockResolvedValue(payment());
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.order.updateMany.mockResolvedValue({ count: 0 });
      const res = await service.handleGoalpayWebhook(SIG, body('payment.success'));
      expect(res.status).toBe('needs-refund');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ newValue: 'CONFIRMATION_TARDIVE_A_REMBOURSER' }));
    });

    it('payment.failed : paiement ECHOUEE, commande ECHOUEE, stock restitué', async () => {
      arm();
      const res = await service.handleGoalpayWebhook(SIG, body('payment.failed'));
      expect(res.status).toBe('ECHOUEE');
      expect(prisma.order.updateMany).toHaveBeenCalledWith({ where: { id: 5, status: 'EN_ATTENTE_PAIEMENT' }, data: { status: 'ECHOUEE' } });
      expect(prisma.product.updateMany).toHaveBeenCalled();
    });

    it('payment.expired : paiement EXPIREE', async () => {
      arm();
      expect((await service.handleGoalpayWebhook(SIG, body('payment.expired'))).status).toBe('EXPIREE');
    });

    it('payment.canceled : aucune modification', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment());
      const res = await service.handleGoalpayWebhook(SIG, body('payment.canceled'));
      expect(res.status).toBe('noop');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('événement inconnu : accusé de réception sans effet', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment());
      expect((await service.handleGoalpayWebhook(SIG, body('payment.autre'))).status).toBe('ignored');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getLatestForUser', () => {
    it('404 sans paiement', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.getLatestForUser(1)).rejects.toThrow(NotFoundException);
    });
    it('renvoie le dernier paiement du client via getStatus', async () => {
      prisma.payment.findFirst.mockResolvedValue({ orderId: 5 });
      prisma.order.findUnique.mockResolvedValue({ id: 5, userId: 1, payment: { id: 3, status: 'VALIDEE', expiresAt: new Date() } });
      expect((await service.getLatestForUser(1)).status).toBe('VALIDEE');
      expect(prisma.payment.findFirst.mock.calls[0][0].where).toEqual({ order: { userId: 1 } });
    });
  });
});
