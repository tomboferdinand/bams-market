import { normalizeEmail, normalizePhone, normalizeIdentifier } from './identity';

describe('identity', () => {
  it('met l’e-mail en minuscules sans espaces', () => {
    expect(normalizeEmail('  Jean.Dupont@Mail.COM ')).toBe('jean.dupont@mail.com');
  });

  it('ramène tous les formats de numéro à 03XXXXXXXX', () => {
    expect(normalizePhone('0341234567')).toBe('0341234567');
    expect(normalizePhone('+261341234567')).toBe('0341234567');
    expect(normalizePhone('261 34 12 345 67')).toBe('0341234567');
    expect(normalizePhone('034.12.345.67')).toBe('0341234567');
  });

  it('laisse un numéro non malgache tel quel (la validation le refusera)', () => {
    expect(normalizePhone('0351234567')).toBe('0351234567');
    expect(normalizePhone('abc')).toBe('abc');
  });

  it('distingue e-mail et téléphone pour la connexion', () => {
    expect(normalizeIdentifier('Jean@Mail.com')).toBe('jean@mail.com');
    expect(normalizeIdentifier('+261 34 12 345 67')).toBe('0341234567');
  });
});
