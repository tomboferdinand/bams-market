import { generateToken, hashToken } from './tokens';

describe('tokens', () => {
  it('génère un jeton aléatoire et son empreinte SHA-256', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.token).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.token === b.token).toBe(false);
    expect(hashToken(a.token)).toBe(a.hash);
    expect(a.hash === a.token).toBe(false);
  });

  it('produit toujours la même empreinte pour le même jeton', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc') === hashToken('abd')).toBe(false);
  });
});
