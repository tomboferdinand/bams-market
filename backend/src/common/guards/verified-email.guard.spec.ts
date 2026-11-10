import { EMAIL_NOT_VERIFIED_MESSAGE, VerifiedEmailGuard } from './verified-email.guard';

const ctx = (user: any) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as any;

describe('VerifiedEmailGuard', () => {
  const guard = new VerifiedEmailGuard();

  it('laisse passer un compte dont l’e-mail est vérifié', () => {
    expect(guard.canActivate(ctx({ id: 1, verificationStatus: 'VERIFIE' }))).toBe(true);
  });

  it('refuse (403) un compte non vérifié avec le message attendu par le frontend', () => {
    try {
      guard.canActivate(ctx({ id: 1, verificationStatus: 'NON_VERIFIE' }));
      throw new Error('aurait dû refuser');
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
      expect(e.message).toBe(EMAIL_NOT_VERIFIED_MESSAGE);
    }
  });

  it('refuse une requête sans utilisateur', () => {
    expect(() => guard.canActivate(ctx(undefined))).toThrow();
  });
});
