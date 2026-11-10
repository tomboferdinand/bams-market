import { UsersService } from './users.service';
import { hashToken } from '../auth/tokens';

describe('UsersService', () => {
  let prisma: any;
  let mail: any;
  let service: UsersService;
  const selected = { id: 1, email: 'nouveau@mail.com', verificationStatus: 'NON_VERIFIE' };

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({ email: 'ancien@mail.com' }),
        update: jest.fn().mockResolvedValue(selected),
        count: jest.fn(),
      },
    };
    mail = { sendVerificationEmail: jest.fn().mockResolvedValue(true) };
    service = new UsersService(prisma, mail);
  });

  describe('updateProfile', () => {
    it('un nouvel e-mail repasse le compte en non vérifié, stocke l’empreinte et envoie le lien', async () => {
      await service.updateProfile(1, { email: 'nouveau@mail.com' } as any);
      const data = prisma.user.update.mock.calls[0][0].data;
      expect(data.verificationStatus).toBe('NON_VERIFIE');
      expect(data.verificationTokenExpiresAt instanceof Date).toBe(true);
      const [to, token] = mail.sendVerificationEmail.mock.calls[0];
      expect(to).toBe('nouveau@mail.com');
      expect(hashToken(token)).toBe(data.verificationToken);
    });

    it('le même e-mail ne déclenche ni nouvelle vérification ni e-mail', async () => {
      prisma.user.findUnique.mockResolvedValue({ email: 'nouveau@mail.com' });
      await service.updateProfile(1, { email: 'nouveau@mail.com', firstName: 'Jean' } as any);
      const data = prisma.user.update.mock.calls[0][0].data;
      expect(data.verificationStatus).toBeUndefined();
      expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('changer seulement le nom ne touche pas à la vérification', async () => {
      await service.updateProfile(1, { firstName: 'Paul' } as any);
      expect(prisma.user.update.mock.calls[0][0].data).toEqual({ firstName: 'Paul' });
      expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('refuse un e-mail déjà pris par un autre compte', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 2 });
      await expect(service.updateProfile(1, { email: 'pris@mail.com' } as any)).rejects.toThrow('déjà utilisé');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('findByEmailOrPhone', () => {
    it('cherche aussi les anciennes écritures +261 d’un numéro', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await service.findByEmailOrPhone('0341234567');
      const where = prisma.user.findFirst.mock.calls[0][0].where;
      expect(where.OR[1].phone.in).toEqual(['0341234567', '+261341234567', '261341234567']);
    });

    it('cherche un e-mail tel quel', async () => {
      await service.findByEmailOrPhone('jean@mail.com');
      const where = prisma.user.findFirst.mock.calls[0][0].where;
      expect(where.OR[0]).toEqual({ email: 'jean@mail.com' });
      expect(where.OR[1].phone.in).toEqual(['jean@mail.com']);
    });
  });

  describe('verrouillage', () => {
    it('verrouille au seuil et remet le compteur à zéro', async () => {
      prisma.user.update
        .mockResolvedValueOnce({ loginAttempts: 5 })
        .mockResolvedValueOnce({});
      const locked = await service.registerLoginFailure(1, 5, 15);
      expect(locked).toBe(true);
      const second = prisma.user.update.mock.calls[1][0].data;
      expect(second.loginAttempts).toBe(0);
      expect(second.loginLockedUntil instanceof Date).toBe(true);
    });

    it('ne verrouille pas sous le seuil', async () => {
      prisma.user.update.mockResolvedValueOnce({ loginAttempts: 2 });
      expect(await service.registerLoginFailure(1, 5, 15)).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });
  });
});
