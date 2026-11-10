/**
 * Masque le milieu d'un numéro de téléphone en gardant le début et la fin
 * lisibles : l'utilisateur reconnaît son numéro sans l'exposer en entier.
 * "0341234567" → "034•••••67"
 */
export function maskPhone(phone: string, keepStart = 3, keepEnd = 2): string {
  const p = phone.trim();
  if (p.length <= keepStart + keepEnd) return p;
  return p.slice(0, keepStart) + "•".repeat(p.length - keepStart - keepEnd) + p.slice(-keepEnd);
}
