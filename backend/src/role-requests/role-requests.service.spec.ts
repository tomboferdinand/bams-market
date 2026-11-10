import { BadGatewayException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RoleRequestsService } from './role-requests.service';
import { hashToken } from '../auth/tokens';

describe('RoleRequestsService', () => {
  let prisma: any;
  let audit: any;
  let mail: any;
  let provider: any;
  let service: RoleRequestsService;

  const pendingRequest = (over: any = {}) => ({
    id: 3, status: 'EN_ATTENTE', userId: 9, requestedRole: 'COMMERCANT', payoutPhone: '0341234567',
    user: { id: 9, role: 'CLIENT', firstName: 'Jean', lastName: 'R', email: 'jean@mail.com' },
    ...over,
  });

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn().mockResolvedValue(null), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      roleRequest: {
        findMany: jest.fn(), findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 3 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    audit = { log: jest.fn() };
    mail = { sendRoleActivationEmail: jest.fn().mockResolvedValue(true), sendRoleRequestRefusedEmail: jest.fn().mockResolvedValue(true) };
    provider = { ensureWhitelisted: jest.fn().mockResolvedValue(undefined) };
    service = new RoleRequestsService(prisma, audit, mail, provider);
  });

  describe('create', () => {
    const dto = { requestedRole: 'LIVREUR', payoutPhone: '034 12 345 67' } as any;

    it('crée une demande avec le numéro normalisé', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 9, role: 'CLIENT' });
      await service.create(9, dto);
      expect(prisma.roleRequest.create.mock.calls[0][0].data).toMatchObject({
        userId: 9, requestedRole: 'LIVREUR', payoutPhone: '0341234567',
      });
      expect(audit.log).toHaveBeenCalled();
    });

    it('refuse un non-client (403)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 9, role: 'COMMERCANT' });
      await expect(service.create(9, dto)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuse un numéro invalide (400)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 9, role: 'CLIENT' });
      await expect(service.create(9, { ...dto, payoutPhone: '12345' })).rejects.toThrow('invalide');
    });

    it('refuse une seconde demande en attente (409)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 9, role: 'CLIENT' });
      prisma.roleRequest.findFirst.mockResolvedValue({ id: 1 });
      await expect(service.create(9, dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuse un numéro déjà utilisé par un autre compte (409)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 9, role: 'CLIENT' });
      prisma.user.findFirst.mockResolvedValue({ id: 2 });
      await expect(service.create(9, dto)).rejects.toThrow('déjà utilisé');
    });
  });

  describe('approve', () => {
    it('autorise le numéro et envoie le lien d’activation, SANS changer le rôle', async () => {
      prisma.roleRequest.findUnique.mockResolvedValueOnce(pendingRequest()).mockResolvedValueOnce({ id: 3 });
      const res = await service.approve(1, 3);
      expect(provider.ensureWhitelisted).toHaveBeenCalledWith('0341234567', 'Jean R', expect.any(Number));
      const claim = prisma.roleRequest.updateMany.mock.calls[0][0];
      expect(claim.data.status).toBe('A_ACTIVER');
      expect(claim.data.activationTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      const [to, sentToken, role] = mail.sendRoleActivationEmail.mock.calls[0];
      expect(to).toBe('jean@mail.com');
      expect(role).toBe('COMMERCANT');
      expect(hashToken(sentToken)).toBe(claim.data.activationTokenHash);
      expect(res.emailSent).toBe(true);
    });

    it('signale quand l’e-mail n’a pas pu partir', async () => {
      prisma.roleRequest.findUnique.mockResolvedValueOnce(pendingRequest()).mockResolvedValueOnce({ id: 3 });
      mail.sendRoleActivationEmail.mockResolvedValue(false);
      expect((await service.approve(1, 3)).emailSent).toBe(false);
    });

    it('laisse la demande en attente si le fournisseur refuse le numéro', async () => {
      prisma.roleRequest.findUnique.mockResolvedValue(pendingRequest());
      provider.ensureWhitelisted.mockRejectedValue(new Error('refusé'));
      await expect(service.approve(1, 3)).rejects.toBeInstanceOf(BadGatewayException);
      expect(prisma.roleRequest.updateMany).not.toHaveBeenCalled();
    });

    it('refuse une demande déjà traitée (409)', async () => {
      prisma.roleRequest.findUnique.mockResolvedValue(pendingRequest({ status: 'REFUSEE' }));
      await expect(service.approve(1, 3)).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuse si le compte n’est plus un client (409)', async () => {
      prisma.roleRequest.findUnique.mockResolvedValue(pendingRequest({ user: { ...pendingRequest().user, role: 'LIVREUR' } }));
      await expect(service.approve(1, 3)).rejects.toBeInstanceOf(ConflictException);
    });

    it('une décision rejouée en parallèle ne change rien (409), sans e-mail', async () => {
      prisma.roleRequest.findUnique.mockResolvedValue(pendingRequest());
      prisma.roleRequest.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.approve(1, 3)).rejects.toBeInstanceOf(ConflictException);
      expect(mail.sendRoleActivationEmail).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    const awaiting = (over: any = {}) => ({
      id: 3, status: 'A_ACTIVER', userId: 9, requestedRole: 'COMMERCANT', payoutPhone: '0341234567',
      activationExpiresAt: new Date(Date.now() + 60_000), ...over,
    });

    it('cherche l’empreinte du jeton, change le rôle et enregistre le numéro', async () => {
      prisma.roleRequest.findUnique.mockResolvedValue(awaiting());
      const res = await service.activate('jeton-valide-123');
      expect(prisma.roleRequest.findUnique.mock.calls[0][0].where).toEqual({ activationTokenHash: hashToken('jeton-valide-123') });
      expect(prisma.user.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: 9, role: 'CLIENT' },
        data: { role: 'COMMERCANT', payoutPhone: '0341234567' },
      });
      expect(prisma.roleRequest.updateMany.mock.calls[0][0].data).toMatchObject({
        status: 'APPROUVEE', activationTokenHash: null, activationExpiresAt: null,
      });
      expect(res).toEqual({ success: true, role: 'COMMERCANT' });
      expect(audit.log).toHaveBeenCalledTimes(2);
    });

    it('refuse un jeton inconnu, déjà utilisé ou expiré (400)', async () => {
      prisma.roleRequest.findUnique.mockResolvedValue(null);
      await expect(service.activate('jeton-inconnu-1')).rejects.toBeInstanceOf(BadRequestException);
      prisma.roleRequest.findUnique.mockResolvedValue(awaiting({ status: 'APPROUVEE' }));
      await expect(service.activate('jeton-deja-utilise')).rejects.toBeInstanceOf(BadRequestException);
      prisma.roleRequest.findUnique.mockResolvedValue(awaiting({ activationExpiresAt: new Date(Date.now() - 1000) }));
      await expect(service.activate('jeton-expire-1234')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('refuse si le numéro a été attribué entre-temps à un autre compte (409)', async () => {
      prisma.roleRequest.findUnique.mockResolvedValue(awaiting());
      prisma.user.findFirst.mockResolvedValue({ id: 2 });
      await expect(service.activate('jeton-valide-123')).rejects.toBeInstanceOf(ConflictException);
    });

    it('un second clic en parallèle ne change rien (400)', async () => {
      prisma.roleRequest.findUnique.mockResolvedValue(awaiting());
      prisma.roleRequest.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.activate('jeton-valide-123')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('resendActivation', () => {
    const awaiting = (age: number) => ({
      id: 3, requestedRole: 'LIVREUR', updatedAt: new Date(Date.now() - age), user: { email: 'jean@mail.com' },
    });

    it('le demandeur reçoit un nouveau lien, et l’ancien est remplacé', async () => {
      prisma.roleRequest.findFirst.mockResolvedValue(awaiting(120_000));
      prisma.roleRequest.update = jest.fn().mockResolvedValue({ id: 3 });
      await service.resendActivation(3, { userId: 9 });
      expect(prisma.roleRequest.update.mock.calls[0][0].data.activationTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(mail.sendRoleActivationEmail).toHaveBeenCalledTimes(1);
    });

    it('limite le demandeur à un envoi par minute (429), pas l’administrateur', async () => {
      prisma.roleRequest.findFirst.mockResolvedValue(awaiting(5_000));
      prisma.roleRequest.update = jest.fn().mockResolvedValue({ id: 3 });
      await expect(service.resendActivation(3, { userId: 9 })).rejects.toMatchObject({ status: 429 });
      await expect(service.resendActivation(3, { adminId: 1 })).resolves.toEqual({ success: true });
    });

    it('introuvable si la demande n’attend pas d’activation', async () => {
      prisma.roleRequest.findFirst.mockResolvedValue(null);
      await expect(service.resendActivation(3, { userId: 9 })).rejects.toThrow('Aucune demande');
    });
  });

  describe('reject', () => {
    it('enregistre le motif et prévient par e-mail', async () => {
      prisma.roleRequest.findUnique
        .mockResolvedValueOnce({ id: 3, requestedRole: 'LIVREUR', user: { email: 'jean@mail.com' } })
        .mockResolvedValueOnce({ id: 3 });
      await service.reject(1, 3, '  Dossier incomplet  ');
      expect(prisma.roleRequest.updateMany.mock.calls[0][0].data).toMatchObject({
        status: 'REFUSEE', rejectionReason: 'Dossier incomplet', decidedById: 1,
      });
      expect(mail.sendRoleRequestRefusedEmail).toHaveBeenCalledWith('jean@mail.com', 'LIVREUR', 'Dossier incomplet');
    });

    it('refuse une demande déjà traitée (409)', async () => {
      prisma.roleRequest.findUnique.mockResolvedValue({ id: 3, requestedRole: 'LIVREUR', user: { email: null } });
      prisma.roleRequest.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.reject(1, 3, 'Motif valable')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  it('cancel : introuvable si aucune demande en attente', async () => {
    prisma.roleRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.cancel(9, 3)).rejects.toThrow('Aucune demande');
  });
});
