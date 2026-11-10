import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { hashToken } from './tokens';

const future = (ms: number) => new Date(Date.now() + ms);

describe('AuthService (comptes réels)', () => {
  let users: any;
  let jwt: any;
  let mail: any;
  let audit: any;
  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('Test1234', 4);
  });

  const baseUser = (over: any = {}) => ({
    id: 1, email: 'jean@mail.com', phone: '0341234567', firstName: 'Jean', lastName: 'R',
    role: 'CLIENT', accountStatus: 'ACTIF', verificationStatus: 'NON_VERIFIE', createdAt: new Date(),
    passwordHash, loginAttempts: 0, loginLockedUntil: null, ...over,
  });

  beforeEach(() => {
    users = {
      existsByEmailOrPhone: jest.fn().mockResolvedValue(false),
      create: jest.fn(async (d: any) => baseUser({ ...d, id: 7 })),
      setVerificationToken: jest.fn(),
      findByEmailOrPhone: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByVerificationToken: jest.fn(),
      markAsVerified: jest.fn(),
      registerLoginFailure: jest.fn().mockResolvedValue(false),
      resetLoginFailures: jest.fn(),
      setPasswordResetToken: jest.fn(),
      findByPasswordResetToken: jest.fn(),
      completePasswordReset: jest.fn(),
      updatePasswordHash: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('jwt') };
    mail = { sendVerificationEmail: jest.fn().mockResolvedValue(true), sendPasswordResetEmail: jest.fn().mockResolvedValue(true) };
    audit = { log: jest.fn() };
    service = new AuthService(users, jwt, mail, audit);
  });

  describe('register', () => {
    it('stocke l’empreinte du jeton et envoie le jeton lui-même par e-mail', async () => {
      await service.register({ firstName: 'Jean', lastName: 'R', email: 'jean@mail.com', password: 'Test1234' } as any);
      const [userId, storedHash] = users.setVerificationToken.mock.calls[0];
      const [to, sentToken] = mail.sendVerificationEmail.mock.calls[0];
      expect(userId).toBe(7);
      expect(to).toBe('jean@mail.com');
      expect(storedHash === sentToken).toBe(false);
      expect(hashToken(sentToken)).toBe(storedHash);
    });

    it('réussit même si l’envoi de l’e-mail échoue', async () => {
      mail.sendVerificationEmail.mockResolvedValue(false);
      const res = await service.register({ firstName: 'Jean', lastName: 'R', email: 'jean@mail.com', password: 'Test1234' } as any);
      expect(res.user.id).toBe(7);
    });

    it('envoie toujours le lien de vérification (e-mail obligatoire à l’inscription)', async () => {
      await service.register({ firstName: 'Jean', lastName: 'R', email: 'jean@mail.com', phone: '0341234567', password: 'Test1234' } as any);
      expect(mail.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it('refuse un doublon', async () => {
      users.existsByEmailOrPhone.mockResolvedValue(true);
      await expect(service.register({ firstName: 'J', lastName: 'R', email: 'a@b.mg', password: 'Test1234' } as any)).rejects.toThrow('existe déjà');
    });
  });

  describe('login', () => {
    it('normalise l’identifiant (e-mail en majuscules, numéro +261)', async () => {
      users.findByEmailOrPhone.mockResolvedValue(baseUser());
      await service.login({ identifier: 'Jean@Mail.COM', password: 'Test1234' });
      await service.login({ identifier: '+261 34 12 345 67', password: 'Test1234' });
      expect(users.findByEmailOrPhone).toHaveBeenCalledWith('jean@mail.com');
      expect(users.findByEmailOrPhone).toHaveBeenCalledWith('0341234567');
    });

    it('compte un échec sur mauvais mot de passe', async () => {
      users.findByEmailOrPhone.mockResolvedValue(baseUser());
      await expect(service.login({ identifier: 'jean@mail.com', password: 'Mauvais123' })).rejects.toThrow('Identifiants incorrects');
      expect(users.registerLoginFailure).toHaveBeenCalledWith(1, 5, 15);
    });

    it('refuse (429) un compte verrouillé, même avec le bon mot de passe', async () => {
      users.findByEmailOrPhone.mockResolvedValue(baseUser({ loginLockedUntil: future(10 * 60_000) }));
      try {
        await service.login({ identifier: 'jean@mail.com', password: 'Test1234' });
        throw new Error('aurait dû refuser');
      } catch (e: any) {
        expect(e.getStatus()).toBe(429);
        expect(e.message).toMatch(/verrouillé/);
      }
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('remet le compteur à zéro après une connexion réussie', async () => {
      users.findByEmailOrPhone.mockResolvedValue(baseUser({ loginAttempts: 3 }));
      const res = await service.login({ identifier: 'jean@mail.com', password: 'Test1234' });
      expect(res.accessToken).toBe('jwt');
      expect(users.resetLoginFailures).toHaveBeenCalledWith(1);
    });

    it('refuse un compte suspendu', async () => {
      users.findByEmailOrPhone.mockResolvedValue(baseUser({ accountStatus: 'SUSPENDU' }));
      await expect(service.login({ identifier: 'jean@mail.com', password: 'Test1234' })).rejects.toThrow('suspendu');
    });
  });

  describe('vérification de l’e-mail', () => {
    it('cherche le compte par l’empreinte du jeton', async () => {
      users.findByVerificationToken.mockResolvedValue(baseUser({ verificationTokenExpiresAt: future(60_000) }));
      await service.verifyEmail('montoken');
      expect(users.findByVerificationToken).toHaveBeenCalledWith(hashToken('montoken'));
      expect(users.markAsVerified).toHaveBeenCalledWith(1);
    });

    it('refuse un jeton expiré, inconnu ou absent', async () => {
      users.findByVerificationToken.mockResolvedValue(baseUser({ verificationTokenExpiresAt: new Date(Date.now() - 1000) }));
      await expect(service.verifyEmail('x')).rejects.toThrow('invalide ou expiré');
      users.findByVerificationToken.mockResolvedValue(null);
      await expect(service.verifyEmail('x')).rejects.toThrow('invalide ou expiré');
      await expect(service.verifyEmail(undefined as any)).rejects.toThrow('invalide ou expiré');
    });

    it('signale une erreur 503 si le renvoi du lien échoue', async () => {
      users.findById.mockResolvedValue(baseUser());
      mail.sendVerificationEmail.mockResolvedValue(false);
      await expect(service.resendVerification(1)).rejects.toThrow('Impossible d');
    });
  });

  describe('mot de passe oublié', () => {
    it('répond pareil pour une adresse inconnue, sans envoyer d’e-mail', async () => {
      users.findByEmail.mockResolvedValue(null);
      const res = await service.forgotPassword({ email: 'inconnu@mail.com' });
      expect(res.success).toBe(true);
      expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(users.setPasswordResetToken).not.toHaveBeenCalled();
    });

    it('stocke l’empreinte du jeton (valable 1 h) et envoie le lien', async () => {
      users.findByEmail.mockResolvedValue(baseUser());
      const res = await service.forgotPassword({ email: 'jean@mail.com' });
      const [id, hash, expiresAt] = users.setPasswordResetToken.mock.calls[0];
      const [to, token] = mail.sendPasswordResetEmail.mock.calls[0];
      expect(res.success).toBe(true);
      expect(id).toBe(1);
      expect(to).toBe('jean@mail.com');
      expect(hashToken(token)).toBe(hash);
      const ms = expiresAt.getTime() - Date.now();
      expect(ms).toBeGreaterThan(59 * 60_000);
      expect(ms).toBeLessThanOrEqual(60 * 60_000);
    });

    it('n’envoie rien à un compte suspendu', async () => {
      users.findByEmail.mockResolvedValue(baseUser({ accountStatus: 'SUSPENDU' }));
      await service.forgotPassword({ email: 'jean@mail.com' });
      expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('réinitialise avec un jeton valide, consomme le jeton et journalise', async () => {
      users.findByPasswordResetToken.mockResolvedValue(baseUser({ passwordResetExpiresAt: future(60_000) }));
      await service.resetPassword({ token: 'abc', newPassword: 'Nouveau123' });
      expect(users.findByPasswordResetToken).toHaveBeenCalledWith(hashToken('abc'));
      const [id, newHash] = users.completePasswordReset.mock.calls[0];
      expect(id).toBe(1);
      expect(await bcrypt.compare('Nouveau123', newHash)).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PASSWORD_RESET', entityId: 1 }));
    });

    it('refuse un jeton inconnu ou expiré', async () => {
      users.findByPasswordResetToken.mockResolvedValue(null);
      await expect(service.resetPassword({ token: 'x', newPassword: 'Nouveau123' })).rejects.toThrow('invalide ou expiré');
      users.findByPasswordResetToken.mockResolvedValue(baseUser({ passwordResetExpiresAt: new Date(Date.now() - 1000) }));
      await expect(service.resetPassword({ token: 'x', newPassword: 'Nouveau123' })).rejects.toThrow('invalide ou expiré');
      expect(users.completePasswordReset).not.toHaveBeenCalled();
    });
  });
});
