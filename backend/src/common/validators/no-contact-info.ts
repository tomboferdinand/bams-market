import { registerDecorator, ValidationOptions } from 'class-validator';

// BR-SEC-06 (anti-contournement) : une annonce publique (nom/description d'un produit ou d'une
// boutique) ne doit pas contenir de moyen de contacter le vendeur hors de la plateforme.
// Le filtre est volontairement simple et explicable : il décourage le contournement honnête,
// il ne prétend pas arrêter un fraudeur déterminé (voir aussi les CGU et la modération admin).

const FORBIDDEN_WORDS: RegExp[] = [
  /whats?\s*'?s?\s*app/, /\bwa\.me\b/, /\bwtsp\b/, /\bwhatsap\b/,
  /telegram/, /\bviber\b/, /messenger/, /facebook/, /\bfb\.com\b/, /instagram/, /tiktok/,
  /m\s*-?\s*vola/, /orange\s*-?\s*money/, /airtel\s*-?\s*money/, /\bairtel\s*money\b/,
  /paiement\s+(?:direct|hors|en\s+dehors)/, /hors\s+(?:site|plateforme|application)/,
  /contactez[\s-]*(?:moi|nous)/, /appelez[\s-]*(?:moi|nous)/, /appel(?:er)?\s+(?:moi|nous)/,
];

const EMAIL = /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-z0-9-]+(?:\.|\s*\(dot\)\s*)[a-z]{2,}/;
const URL_LIKE = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|mg|me|io|app|link)\b)/;
// Numéros malgaches : 03x xx xxx xx, +261 3x xx xxx xx, 261 3x ... (séparateurs libres).
// Ancré : toute la suite de chiffres doit être un numéro (évite les faux positifs sur références, codes-barres, horodatages).
const MG_PHONE_DIGITS = /^(?:261|0)?3[2348]\d{7}$/;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Renvoie true si le texte contient un numéro, un e-mail, un lien ou une mention de contact/paiement externe. */
export function containsContactInfo(text: unknown): boolean {
  if (typeof text !== 'string' || text.trim() === '') return false;
  const t = normalize(text);

  if (FORBIDDEN_WORDS.some((re) => re.test(t))) return true;
  if (EMAIL.test(t) || URL_LIKE.test(t)) return true;

  // Suites de chiffres entrecoupées de séparateurs (« 034 12 345 67 », « 034.12.345.67 », « +261-34-... »).
  const runs = t.match(/\+?\d(?:[\s.\-()/]*\d){7,}/g) ?? [];
  for (const run of runs) {
    const digits = run.replace(/\D/g, '');
    if (MG_PHONE_DIGITS.test(digits)) return true;
  }
  return false;
}

export function NoContactInfo(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'noContactInfo',
      target: object.constructor,
      propertyName,
      options: {
        message:
          'Ce champ ne doit pas contenir de numéro de téléphone, d’adresse e-mail, de lien ni de mention d’un moyen de contact ou de paiement externe (WhatsApp, Mvola, Orange Money…). Les échanges et paiements passent par Bam’S Market.',
        ...validationOptions,
      },
      validator: {
        validate: (value: unknown) => !containsContactInfo(value),
      },
    });
  };
}
