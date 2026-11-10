import { createHash, randomBytes } from 'crypto';

/** Jeton aléatoire envoyé par e-mail ; seule son empreinte est stockée en base. */
export function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
export const RESET_TTL_MS = 60 * 60 * 1000; // 1 h
