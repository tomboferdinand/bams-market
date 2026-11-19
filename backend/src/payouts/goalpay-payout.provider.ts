import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { goalpayUrl } from '../payments/goalpay.client';
import { PayoutPreview, PayoutProvider, PayoutResult, PayoutStatusResult } from './payout-provider';

/**
 * Retraits réels GoalPay (API « liste blanche », guide marchand GoalPay).
 *
 * Authentification de chaque appel (en-têtes) :
 *   x-gpay-token     = GOALPAY_ACCESS_KEY (la même clé que pour le paiement) ;
 *   x-gpay-signature = HMAC-SHA256(secret, secret) en hexadécimal, secret = GOALPAY_WEBHOOK_SECRET
 *                      (valeur fixe par conception, confirmée par GoalPay ; x-gpay-signature-version facultatif).
 *
 * Prudence : seules les réponses de « max-retirable » et des webhooks sont documentées. Tout ce qui
 * n'est pas reconnu laisse le retrait EN ATTENTE (jamais de recrédit à l'aveugle) et la STRUCTURE de la
 * réponse (noms des champs et types, aucune valeur) est journalisée pour ajuster le code après le
 * premier essai réel. Le jeton et le secret ne sont jamais journalisés.
 */

const BASE = '/api/access/sites';
/** Délai maximum d'un appel GoalPay : GOALPAY_TIMEOUT_MS (15 000 ms par défaut). */
const goalpayTimeoutMs = () => {
  const n = Number(process.env.GOALPAY_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 1000 ? n : 15_000;
};

/** Numéro de téléphone dans un chemin : « /withdraw-white-list/0341234567/… » → « /withdraw-white-list/034•••67/… ». */
export function maskPath(path: string): string {
  return path.replace(/(?:\+?261|0)\d{9}/g, (m) => `${m.slice(0, 3)}•••${m.slice(-2)}`);
}

/** Texte journalisé : jeton et secret retirés s'ils apparaissent, toute suite de 5 chiffres ou plus masquée. */
export function maskDigits(text: string): string {
  let out = text;
  for (const secret of [process.env.GOALPAY_ACCESS_KEY, process.env.GOALPAY_WEBHOOK_SECRET]) {
    if (secret && secret.trim().length >= 4) out = out.split(secret.trim()).join('[masqué]');
  }
  return out.replace(/\d{5,}/g, (m) => `${m.slice(0, 2)}•••${m.slice(-2)}`).slice(0, 300);
}

/** Fonction d'appel HTTP (fetch), remplaçable par un faux client dans les tests. */
export type HttpFetch = (url: string, init: RequestInit) => Promise<Response>;

interface HttpReply {
  status: number;
  body: any;
}

/** Structure d'une réponse sans aucune valeur : { data: { status: "string", montant: "number" } }. */
export function describeShape(value: unknown, depth = 0): unknown {
  if (value === null) return 'null';
  if (Array.isArray(value)) return depth > 3 ? 'array' : [value.length > 0 ? describeShape(value[0], depth + 1) : 'vide'];
  if (typeof value === 'object') {
    if (depth > 3) return 'object';
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, describeShape(v, depth + 1)]));
  }
  return typeof value;
}

/** Statut lisible d'une réponse GoalPay : cherche un champ de statut connu, sinon « inconnu ». */
export function readProviderStatus(body: any): 'success' | 'failed' | 'pending' | 'unknown' {
  const candidates = [body?.status, body?.data?.status, body?.event, body?.data?.event, body?.statut, body?.data?.statut];
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const s = raw.trim().toLowerCase();
    if (['success', 'succeeded', 'successful', 'reussi', 'réussi', 'withdrawal.success', 'completed', 'done'].includes(s)) return 'success';
    if (['failed', 'failure', 'echec', 'échec', 'echoue', 'échoué', 'withdrawal.failed', 'error', 'rejected', 'canceled', 'cancelled'].includes(s)) return 'failed';
    if (['pending', 'en_attente', 'processing', 'in_progress', 'initiated', 'created'].includes(s)) return 'pending';
  }
  return 'unknown';
}

/** Message d'erreur GoalPay lisible (court, sans donnée sensible). */
function providerMessage(body: any): string | undefined {
  const raw = body?.message ?? body?.error ?? body?.data?.message ?? body?.detail;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  // Montré à l'utilisateur : jamais le jeton ni le secret, même si GoalPay les renvoie.
  let text = raw.trim();
  for (const secret of [process.env.GOALPAY_ACCESS_KEY, process.env.GOALPAY_WEBHOOK_SECRET]) {
    if (secret && secret.trim().length >= 4) text = text.split(secret.trim()).join('[masqué]');
  }
  return text.slice(0, 200);
}

const toInt = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : null;
};

// 4xx « définitifs » : le retrait n'a pas été accepté par GoalPay. Les autres 4xx (délai, conflit,
// trop de requêtes) sont ambigus : l'argent a peut-être été envoyé, le retrait reste en attente.
const AMBIGUOUS_4XX = [408, 409, 425, 429];

@Injectable()
export class GoalpayPayoutProvider extends PayoutProvider {
  private readonly logger = new Logger(GoalpayPayoutProvider.name);
  /** Numéros déjà confirmés sur la liste blanche (évite un appel à chaque aperçu). */
  private readonly whitelisted = new Set<string>();

  constructor(private readonly http: HttpFetch = (url, init) => fetch(url, init)) {
    super();
  }

  /** Clés présentes ? Sans elles, aucun appel n'est tenté (le démarrage en production les exige déjà). */
  static isConfigured(env: Record<string, string | undefined> = process.env) {
    return !!env.GOALPAY_ACCESS_KEY?.trim() && !!env.GOALPAY_WEBHOOK_SECRET?.trim();
  }

  private headers() {
    if (!GoalpayPayoutProvider.isConfigured()) {
      throw new ServiceUnavailableException('Les retraits réels ne sont pas configurés. Réessayez plus tard ou contactez l’administration.');
    }
    const secret = process.env.GOALPAY_WEBHOOK_SECRET!.trim();
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-gpay-token': process.env.GOALPAY_ACCESS_KEY!.trim(),
      'x-gpay-signature': createHmac('sha256', secret).update(secret, 'utf8').digest('hex'),
    };
  }

  /**
   * Appel HTTP. Lève une erreur « réseau » (délai, coupure) : à traiter comme une réponse inconnue.
   * Chaque échec (exception réseau ou code HTTP hors 2xx) est journalisé en warn, masqué (voir logFailure).
   */
  private async call(method: string, path: string, body?: unknown): Promise<HttpReply> {
    const headers = this.headers(); // clés absentes : erreur claire, aucun appel
    const started = Date.now();
    let res: Response;
    try {
      res = await this.http(goalpayUrl(`${BASE}${path}`), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(goalpayTimeoutMs()),
      });
    } catch (err) {
      const e = err as Error & { cause?: { code?: string; message?: string } };
      const cause = e?.cause?.code ?? e?.cause?.message;
      this.logger.warn(
        `Appel GoalPay en échec : ${method} ${maskPath(path)} — ${e?.name ?? 'Erreur'} : ${maskDigits(e?.message ?? '')}` +
          `${cause ? ` (cause : ${maskDigits(String(cause))})` : ''} après ${Date.now() - started} ms`,
      );
      throw err;
    }
    let parsed: any = null;
    let raw = '';
    try {
      raw = await res.text();
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      /* réponse vide ou non JSON */
    }
    if (res.status < 200 || res.status >= 300) this.logFailure(method, path, res.status, parsed, raw);
    return { status: res.status, body: parsed };
  }

  /** Échec HTTP : méthode, chemin (numéro masqué), code, clés du corps, message (chiffres masqués). */
  private logFailure(method: string, path: string, status: number, body: any, raw: string) {
    const keys = body && typeof body === 'object' ? Object.keys(body).join(', ') || '(aucune)' : body === null ? '(corps vide ou non JSON)' : typeof body;
    const message = providerMessage(body) ?? (body === null && raw ? raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) : undefined);
    this.logger.warn(
      `Appel GoalPay refusé : ${method} ${maskPath(path)} — HTTP ${status} ; clés : ${keys}` +
        `${message ? ` ; message : ${maskDigits(message)}` : ''}`,
    );
  }

  private logUnknown(operation: string, reply: HttpReply) {
    this.logger.warn(`Réponse GoalPay non reconnue (${operation}, HTTP ${reply.status}) : structure ${JSON.stringify(describeShape(reply.body))}`);
  }

  // ───────────────────────── Liste blanche ─────────────────────────

  /** Idempotent : « déjà présent » compte comme un succès. */
  async ensureWhitelisted(phone: string, ownerName: string, maxAmount: number): Promise<void> {
    if (this.whitelisted.has(phone)) return;
    let reply: HttpReply;
    try {
      reply = await this.call('POST', '/withdraw-white-list', { mobile: phone, max_amount: maxAmount, owner_name: ownerName });
    } catch {
      throw new ServiceUnavailableException('Le service de retrait est momentanément indisponible. Réessayez dans un instant.');
    }
    if (reply.status >= 200 && reply.status < 300) {
      this.whitelisted.add(phone);
      return;
    }
    // Refus : le numéro est peut-être déjà inscrit. On vérifie plutôt que de deviner le message.
    try {
      const existing = await this.call('GET', `/withdraw-white-list/${encodeURIComponent(phone)}`);
      if (existing.status >= 200 && existing.status < 300) {
        this.whitelisted.add(phone);
        return;
      }
    } catch {
      /* traité ci-dessous */
    }
    this.logUnknown('liste blanche', reply);
    throw new ServiceUnavailableException(
      `GoalPay a refusé l’inscription du numéro de retrait${providerMessage(reply.body) ? ` : ${providerMessage(reply.body)}` : '.'}`,
    );
  }

  /** Retire un numéro (ancien numéro remplacé par l'administration). Absent = déjà retiré. */
  async removeFromWhitelist(phone: string): Promise<void> {
    this.whitelisted.delete(phone);
    const reply = await this.call('DELETE', `/withdraw-white-list/${encodeURIComponent(phone)}`);
    if ((reply.status >= 200 && reply.status < 300) || reply.status === 404) return;
    this.logUnknown('suppression liste blanche', reply);
    throw new Error(`Suppression refusée par GoalPay (HTTP ${reply.status}).`);
  }

  // ───────────────────────── Retraits ─────────────────────────

  /** Frais réels : total_debite (débité du portefeuille) et frais_total. */
  async preview(phone: string, amount: number): Promise<PayoutPreview> {
    let reply: HttpReply;
    try {
      reply = await this.call('POST', `/withdraw-white-list/${encodeURIComponent(phone)}/withdraw/preview`, { amount });
    } catch {
      throw new ServiceUnavailableException('Le service de retrait est momentanément indisponible. Réessayez dans un instant.');
    }
    if (reply.status >= 400 && reply.status < 500) {
      // Refus de l'opérateur ou de GoalPay (montant trop faible, plafond, numéro...) : message clair.
      throw new BadRequestException(`Retrait refusé par l’opérateur${providerMessage(reply.body) ? ` : ${providerMessage(reply.body)}` : '. Vérifiez le montant.'}`);
    }
    const data = reply.body?.data && typeof reply.body.data === 'object' ? reply.body.data : reply.body;
    const totalDebited = toInt(data?.total_debite);
    const feesTotal = toInt(data?.frais_total);
    const ok =
      reply.status >= 200 && reply.status < 300 &&
      ((totalDebited !== null && totalDebited >= amount) || (feesTotal !== null && feesTotal >= 0));
    if (!ok) {
      this.logUnknown('aperçu', reply);
      throw new ServiceUnavailableException('Impossible d’obtenir les frais du retrait pour le moment. Réessayez dans un instant.');
    }
    // Le portefeuille est débité de total_debite ; le bénéficiaire reçoit le montant demandé.
    const total = totalDebited !== null && totalDebited >= amount ? totalDebited : amount + (feesTotal as number);
    if (totalDebited !== null && feesTotal !== null && totalDebited !== amount + feesTotal) {
      this.logger.warn(`Aperçu GoalPay : total_debite (${totalDebited}) ≠ montant + frais_total (${amount + feesTotal}) ; total_debite retenu.`);
    }
    return { fees: total - amount, totalDebited: total };
  }

  async withdraw(input: { phone: string; amount: number; reference: string }): Promise<PayoutResult> {
    // Une erreur réseau ou un délai dépassé remonte tel quel : le service laisse le retrait en attente.
    const reply = await this.call('POST', `/withdraw-white-list/${encodeURIComponent(input.phone)}/withdraw`, {
      amount: input.amount,
      reference: input.reference,
    });
    if (reply.status >= 400 && reply.status < 500 && !AMBIGUOUS_4XX.includes(reply.status)) {
      return { status: 'failed', error: `Retrait refusé par l’opérateur${providerMessage(reply.body) ? ` : ${providerMessage(reply.body)}` : '.'}` };
    }
    if (reply.status >= 200 && reply.status < 300) {
      const status = readProviderStatus(reply.body);
      if (status === 'failed') return { status: 'failed', error: providerMessage(reply.body) ?? 'Retrait refusé par l’opérateur.' };
      if (status === 'unknown') this.logUnknown('retrait', reply);
      // Le statut final arrive par webhook (ou par le rattrapage) : même un « success » immédiat est
      // accepté, les autres réponses restent en attente.
      return status === 'success' ? { status: 'success' } : { status: 'pending' };
    }
    this.logUnknown('retrait', reply); // 5xx ou 4xx ambigu
    return { status: 'pending' };
  }

  /** Rattrapage : GET withdraw-status/{notre référence}. Inconnu = toujours en attente. */
  async getStatus(reference: string): Promise<PayoutStatusResult> {
    const reply = await this.call('GET', `/withdraw-status/${encodeURIComponent(reference)}`);
    if (reply.status < 200 || reply.status >= 300) {
      this.logUnknown('statut', reply);
      return { status: 'pending' };
    }
    const status = readProviderStatus(reply.body);
    if (status === 'unknown') {
      this.logUnknown('statut', reply);
      return { status: 'pending' };
    }
    const data = reply.body?.data ?? reply.body;
    const montant = toInt(data?.montant ?? data?.amount);
    return {
      status,
      amount: montant ?? undefined,
      providerReference: typeof data?.reference_operateur === 'string' ? data.reference_operateur : undefined,
      error: status === 'failed' ? providerMessage(reply.body) ?? (typeof reply.body?.error === 'string' ? reply.body.error : undefined) : undefined,
    };
  }
}
