import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Vérification de l'en-tête `x-gpay-signature` des webhooks GoalPay.
 *
 * Dans l'exemple officiel de GoalPay, la signature attendue est HMAC-SHA256(secret) calculé sur
 * le secret lui-même (hex). On accepte aussi, par prudence, HMAC-SHA256 du corps JSON : les deux
 * exigent la connaissance du secret. L'écart est signalé dans les journaux (voir diagnoseSignature)
 * tant que GoalPay n'a pas confirmé la chaîne réellement signée.
 * Quelle que soit la méthode, le service ne se fie jamais à la signature seule : référence,
 * montant et état du paiement sont revérifiés (PaymentsService.handleGoalpayWebhook).
 */
const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data, 'utf8').digest('hex');

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function diagnoseSignature(secret: string, received: string | undefined, body: unknown) {
  const sig = (received ?? '').trim().toLowerCase();
  return {
    matchesSecretOnly: !!sig && safeEqual(sig, hmac(secret, secret)),
    matchesBody: !!sig && safeEqual(sig, hmac(secret, JSON.stringify(body ?? {}))),
  };
}

export function verifyWebhookSignature(secret: string, received: string | undefined, body: unknown): boolean {
  if (!secret) return false;
  const d = diagnoseSignature(secret, received, body);
  return d.matchesSecretOnly || d.matchesBody;
}
