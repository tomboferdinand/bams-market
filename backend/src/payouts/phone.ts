// Numéros Mobile Money malgaches au format national à 10 chiffres : 032 (Orange), 033 (Airtel),
// 034 et 038 (Yas). On accepte « +261 34 12 345 67 », « 261341234567 » ou « 034 12 345 67 »
// et on renvoie « 0341234567 ». Tout autre numéro est refusé (null).
const NATIONAL = /^03[2348]\d{7}$/;

export function normalizeMobile(input: string): string | null {
  let digits = (input ?? '').replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('261') && digits.length === 12) digits = `0${digits.slice(3)}`;
  return NATIONAL.test(digits) ? digits : null;
}
