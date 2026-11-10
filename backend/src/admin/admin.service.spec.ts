import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { makeAuditMock, makePrismaMock } from '../common/testing/mocks';

describe('AdminService', () => {
  let prisma: any, audit: any, service: AdminService;

  beforeEach(() => {
    prisma = makePrismaMock();
    audit = makeAuditMock();
    service = new AdminService(prisma, audit);
  });

  describe('updateUserStatus', () => {
    it('interdit de modifier son propre compte', async () => {
      await expect(service.updateUserStatus(1, 1, 'SUSPENDU' as any)).rejects.toThrow(BadRequestException);
    });
    it('404 si utilisateur inconnu', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.updateUserStatus(1, 2, 'SUSPENDU' as any)).rejects.toThrow(NotFoundException);
    });
    it('refuse un statut identique', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 2, accountStatus: 'ACTIF' });
      await expect(service.updateUserStatus(1, 2, 'ACTIF' as any)).rejects.toThrow(BadRequestException);
    });
    it('met à jour sans supprimer physiquement et journalise (BR-USR-05/07, BR-SEC-01)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 2, accountStatus: 'ACTIF' });
      prisma.user.update.mockResolvedValue({ id: 2, accountStatus: 'SUSPENDU' });
      await service.updateUserStatus(1, 2, 'SUSPENDU' as any);
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 1, action: 'USER_STATUS_CHANGE', previousValue: 'ACTIF', newValue: 'SUSPENDU',
      }));
      const select = prisma.user.update.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('passwordHash'); // BR-SEC-04
    });
  });

  it('listUsers ignore un rôle ou statut invalide', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await service.listUsers('HACKER', 'NIMPORTE');
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role).toBeUndefined();
    expect(where.accountStatus).toBeUndefined();
  });

  it('getOrder : 404 puis masque confirmationCode (BR-LIV-04)', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.getOrder(1)).rejects.toThrow(NotFoundException);
    prisma.order.findUnique.mockResolvedValue({ id: 1, status: 'LIVREE', confirmationCode: '123456' });
    const res = await service.getOrder(1);
    expect(res).not.toHaveProperty('confirmationCode');
    expect(res.id).toBe(1);
  });

  it('getDashboard : volume de paiements à 0 sans paiement validé', async () => {
    prisma.user.count.mockResolvedValue(3);
    prisma.shop.count.mockResolvedValue(1);
    prisma.order.count.mockResolvedValue(0);
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.shop.findMany.mockResolvedValue([]);
    const res = await service.getDashboard();
    expect(res.paymentsVolume).toBe(0);
    expect(res.users).toBe(3);
  });

  describe('refundOrder', () => {
    const failedPaid = (over: any = {}) => ({
      id: 29, status: 'ECHOUEE', total: 4500, refund: null,
      payment: { status: 'VALIDEE', amount: 4500 },
      delivery: { status: 'ECHEC' },
      ...over,
    });

    beforeEach(() => {
      // le mock Prisma partagé ne connaît pas encore le modèle Refund
      prisma.refund = { create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 1, ...data })) };
    });

    it('404 si commande inconnue', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.refundOrder(1, 29, 'MVOLA-123')).rejects.toThrow(NotFoundException);
    });

    it('refuse une commande déjà remboursée', async () => {
      prisma.order.findUnique.mockResolvedValue(failedPaid({ refund: { id: 1 } }));
      await expect(service.refundOrder(1, 29, 'MVOLA-123')).rejects.toThrow(/déjà été remboursée/);
      expect(prisma.refund.create).not.toHaveBeenCalled();
    });

    it("refuse si la livraison n'a pas échoué", async () => {
      prisma.order.findUnique.mockResolvedValue(failedPaid({ status: 'LIVREE', delivery: { status: 'LIVREE' } }));
      await expect(service.refundOrder(1, 29, 'MVOLA-123')).rejects.toThrow(BadRequestException);
      prisma.order.findUnique.mockResolvedValue(failedPaid({ delivery: null }));
      await expect(service.refundOrder(1, 29, 'MVOLA-123')).rejects.toThrow(BadRequestException);
      expect(prisma.refund.create).not.toHaveBeenCalled();
    });

    it('refuse si la commande n\'a jamais été payée', async () => {
      prisma.order.findUnique.mockResolvedValue(failedPaid({ payment: { status: 'EXPIREE', amount: 4500 } }));
      await expect(service.refundOrder(1, 29, 'MVOLA-123')).rejects.toThrow(/rien à rembourser/);
      prisma.order.findUnique.mockResolvedValue(failedPaid({ payment: null }));
      await expect(service.refundOrder(1, 29, 'MVOLA-123')).rejects.toThrow(/rien à rembourser/);
      expect(prisma.refund.create).not.toHaveBeenCalled();
    });

    it('enregistre le remboursement au montant payé, avec la référence, et journalise', async () => {
      prisma.order.findUnique.mockResolvedValue(failedPaid());
      const res = await service.refundOrder(7, 29, '  MVOLA-123 ', ' client absent ');
      expect(prisma.refund.create).toHaveBeenCalledWith({
        data: { orderId: 29, amount: 4500, reference: 'MVOLA-123', note: 'client absent', adminId: 7 },
      });
      expect(res.amount).toBe(4500);
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 7, action: 'ORDER_REFUND', entityType: 'Order', entityId: 29,
      }));
    });

    it('deux clics simultanés : la contrainte d\'unicité refuse le second sans journaliser', async () => {
      prisma.order.findUnique.mockResolvedValue(failedPaid());
      prisma.refund.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.refundOrder(7, 29, 'MVOLA-123')).rejects.toThrow(/déjà été remboursée/);
      expect(audit.log).not.toHaveBeenCalled();
    });
  });
});
