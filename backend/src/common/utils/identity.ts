// Normalisation des identifiants : un même e-mail ou numéro ne doit exister que sous une seule forme.

export const MG_MOBILE = /^(?:\+?261|0)(3[2348]\d{7})$/;

/** « Jean@Mail.COM » → « jean@mail.com ». */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** « +261 34 12 345 67 », « 261341234567 », « 034.12.345.67 » → « 0341234567 ». Sinon, texte nettoyé inchangé. */
export function normalizePhone(input: string): string {
  const compact = input.replace(/[\s.\-()]/g, '');
  const m = MG_MOBILE.exec(compact);
  return m ? `0${m[1]}` : compact;
}

/** Identifiant de connexion : e-mail (minuscules) ou téléphone (forme canonique). */
export function normalizeIdentifier(input: string): string {
  const t = input.trim();
  return t.includes('@') ? normalizeEmail(t) : normalizePhone(t);
}
