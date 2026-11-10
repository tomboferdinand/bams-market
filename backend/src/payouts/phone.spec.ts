import { normalizeMobile } from './phone';

describe('normalizeMobile', () => {
  it('normalise les formats courants vers le format national', () => {
    expect(normalizeMobile('0341234567')).toBe('0341234567');
    expect(normalizeMobile('034 12 345 67')).toBe('0341234567');
    expect(normalizeMobile('+261 34 12 345 67')).toBe('0341234567');
    expect(normalizeMobile('261321234567')).toBe('0321234567');
  });

  it('refuse les numéros invalides', () => {
    for (const bad of ['', 'abc', '0351234567', '034123456', '03412345678', '+33612345678']) {
      expect(normalizeMobile(bad)).toBeNull();
    }
  });
});
