/** Numéro mobile malgache (032, 033, 034, 038), avec ou sans +261, espaces tolérés. */
export function normalizeMobile(input: string): string | null {
  const digits = input.replace(/[\s.\-]/g, "");
  const m = /^(?:\+?261|0)(3[2348]\d{7})$/.exec(digits);
  return m ? `0${m[1]}` : null;
}

export const MIN_REASON_LENGTH = 5;

/** Message d'erreur de saisie du changement de numéro de retrait, ou null si la saisie est acceptable. */
export function payoutPhoneIssue(phone: string, reason: string, current: string | null): string | null {
  const normalized = normalizeMobile(phone);
  if (!normalized) return "Numéro mobile invalide (032, 033, 034 ou 038).";
  if (normalized === current) return "C'est déjà le numéro de retrait actuel.";
  if (reason.trim().length < MIN_REASON_LENGTH) return `Indiquez le motif (${MIN_REASON_LENGTH} caractères minimum).`;
  return null;
}
