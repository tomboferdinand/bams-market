import { BadRequestException, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { makeAuditMock, makePrismaMock } from '../common/testing/mocks';

describe('DeliveriesService', () => {
  let prisma: any, audit: any, service: DeliveriesService;

  beforeEach(() => {
    prisma = makePrismaMock();
    audit = makeAuditMock();
    service = new DeliveriesService(prisma, audit);
  });

  it('ne sélectionne jamais confirmationCode pour le livreur (BR-LIV-04)', async () => {
    prisma.delivery.findMany.mockResolvedValue([]);
    await service.findAvailable();
    await service.findMine(5);
    await service.findHistory(5);
    for (const call of prisma.delivery.findMany.mock.calls) {
      const select = call[0].include.order.select;
      expect(select).not.toHaveProperty('confirmationCode');
    }
  });

  it("avant acceptation, le livreur ne voit ni téléphone ni adresse exacte (BR-SEC-06)", async () => {
    prisma.delivery.findMany.mockResolvedValue([]);
    await service.findAvailable();
    const select = prisma.delivery.findMany.mock.calls[0][0].include.order.select;
    expect(select.address).toEqual({ select: { label: true, city: true } });
    expect(select.user).toEqual({ select: { firstName: true } });
    expect(JSON.stringify(select)).not.toContain('phone');
    expect(JSON.stringify(select)).not.toContain('fullAddress');
    expect(select.items.select.product.select.shop).toEqual({ select: { id: true, name: true, address: true } });
  });

  it('après acceptation, le livreur reçoit les coordonnées du client', async () => {
    prisma.delivery.findMany.mockResolvedValue([]);
    await service.findMine(5);
    const select = prisma.delivery.findMany.mock.calls[0][0].include.order.select;
    expect(select.address).toBe(true);
    expect(select.user.select.phone).toBe(true);
  });

  describe('accept', () => {
    it('404 si la mission n’existe pas', async () => {
      prisma.delivery.findUnique.mockResolvedValue(null);
      await expect(service.accept(5, 1)).rejects.toThrow(NotFoundException);
    });

    it('refuse une mission déjà prise (BR-LIV-02)', async () => {
      prisma.delivery.findUnique.mockResolvedValue({ id: 1, status: 'EN_COURS' });
      await expect(service.accept(5, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuse au-delà de 3 missions actives (BR-LIV-03)', async () => {
      prisma.delivery.findUnique.mockResolvedValue({ id: 1, status: 'DISPONIBLE', orderId: 9 });
      prisma.delivery.count.mockResolvedValue(3);
      await expect(service.accept(5, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.delivery.updateMany).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('accepte : livraison réclamée EN_COURS, commande EN_COURS_DE_LIVRAISON, audit', async () => {
      prisma.delivery.findUnique
        .mockResolvedValueOnce({ id: 1, status: 'DISPONIBLE', orderId: 9 })
        .mockResolvedValueOnce({ id: 1, status: 'EN_COURS', livreurId: 5 });
      prisma.delivery.count.mockResolvedValue(1);
      prisma.delivery.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.accept(5, 1);

      expect(res.status).toBe('EN_COURS');
      expect(prisma.delivery.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: 'DISPONIBLE' },
        data: expect.objectContaining({ livreurId: 5, status: 'EN_COURS' }),
      });
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 9 }, data: expect.objectContaining({ status: 'EN_COURS_DE_LIVRAISON' }),
      }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ newValue: 'EN_COURS_DE_LIVRAISON' }));
    });

    it('verrouille le livreur avant de compter ses missions actives (limite fiable)', async () => {
      prisma.delivery.findUnique.mockResolvedValue({ id: 1, status: 'DISPONIBLE', orderId: 9 });
      prisma.delivery.count.mockResolvedValue(0);
      prisma.delivery.updateMany.mockResolvedValue({ count: 1 });

      await service.accept(5, 1);

      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5 } }));
      const lockOrder = prisma.user.update.mock.invocationCallOrder[0];
      const countOrder = prisma.delivery.count.mock.invocationCallOrder[0];
      expect(lockOrder).toBeLessThan(countOrder);
    });

    it('double acceptation : le second livreur est refusé et la commande n’avance pas (BR-LIV-02)', async () => {
      // les deux livreurs ont lu la mission « DISPONIBLE », mais un seul obtient la ligne
      prisma.delivery.findUnique.mockResolvedValue({ id: 1, status: 'DISPONIBLE', orderId: 9 });
      prisma.delivery.count.mockResolvedValue(0);
      prisma.delivery.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.accept(6, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    const active = (over: any = {}) => ({
      id: 1, livreurId: 5, status: 'EN_COURS', orderId: 9, confirmAttempts: 0,
      order: { confirmationCode: '123456' }, ...over,
    });

    it('403 si la mission appartient à un autre livreur', async () => {
      prisma.delivery.findUnique.mockResolvedValue(active({ livreurId: 6 }));
      await expect(service.confirm(5, 1, '123456')).rejects.toThrow(ForbiddenException);
    });

    it('refuse si la mission n’est plus EN_COURS (BR-LIV-05)', async () => {
      prisma.delivery.findUnique.mockResolvedValue(active({ status: 'LIVREE' }));
      await expect(service.confirm(5, 1, '123456')).rejects.toThrow(BadRequestException);
    });

    it('refuse un mauvais code et compte l’essai (BR-LIV-04)', async () => {
      prisma.delivery.findUnique.mockResolvedValue(active());
      prisma.delivery.update.mockResolvedValue({ confirmAttempts: 1 });

      await expect(service.confirm(5, 1, '000000')).rejects.toThrow('Code de confirmation incorrect.');
      expect(prisma.delivery.update).toHaveBeenCalledWith({
        where: { id: 1},
        data: { confirmAttempts: { increment: 1 } },
        select: { confirmAttempts: true },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('au dernier essai autorisé, le message indique le blocage', async () => {
      prisma.delivery.findUnique.mockResolvedValue(active({ confirmAttempts: 4 }));
      prisma.delivery.update.mockResolvedValue({ confirmAttempts: 5 });
      await expect(service.confirm(5, 1, '000000')).rejects.toThrow(/Nombre maximal d'essais atteint/);
    });

    it('bloque la confirmation (429) après 5 codes erronés, même avec le bon code', async () => {
      prisma.delivery.findUnique.mockResolvedValue(active({ confirmAttempts: 5 }));

      const attempt = service.confirm(5, 1, '123456');
      await expect(attempt).rejects.toThrow(HttpException);
      await expect(attempt).rejects.toMatchObject({ status: 429 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    const armConfirm = (over: any = {}) => {
      prisma.delivery.findUnique
        .mockResolvedValueOnce(active({ confirmAttempts: 2, order: { confirmationCode: '123456', merchantAmount: 9000, deliveryFee: 2000 }, ...over }))
        .mockResolvedValueOnce({ id: 1, status: 'LIVREE' });
      prisma.orderItem.findFirst.mockResolvedValue({ product: { shop: { ownerId: 77 } } });
      prisma.delivery.updateMany.mockResolvedValue({ count: 1 });
    };

    it('bon code : livraison LIVREE, commande LIVREE, audit', async () => {
      armConfirm();
      const res = await service.confirm(5, 1, '123456');
      expect(res.status).toBe('LIVREE');
      expect(prisma.delivery.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: 'EN_COURS' },
        data: expect.objectContaining({ status: 'LIVREE' }),
      });
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'LIVREE' }),
      }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ previousValue: 'EN_COURS_DE_LIVRAISON', newValue: 'LIVREE' }));
    });

    it('crédite le commerçant (sous-total − commission) et le livreur (frais de livraison) une seule fois', async () => {
      armConfirm();
      await service.confirm(5, 1, '123456');
      expect(prisma.walletEntry.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.walletEntry.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 77, orderId: 9, type: 'VENTE', amount: 9000, availableAt: expect.any(Date) },
          { userId: 5, orderId: 9, type: 'LIVRAISON', amount: 2000, availableAt: expect.any(Date) },
        ],
      });
    });

    it('le crédit n’est retirable qu’après le délai de séjour (WALLET_HOLD_HOURS)', async () => {
      process.env.WALLET_HOLD_HOURS = '48';
      try {
        armConfirm();
        await service.confirm(5, 1, '123456');
        const [merchantCredit] = prisma.walletEntry.createMany.mock.calls[0][0].data;
        const hours = (merchantCredit.availableAt.getTime() - Date.now()) / 3_600_000;
        expect(hours).toBeGreaterThan(47.9);
        expect(hours).toBeLessThanOrEqual(48);
      } finally {
        delete process.env.WALLET_HOLD_HOURS;
      }
    });

    it('double confirmation simultanée : la seconde est refusée et rien n’est crédité', async () => {
      armConfirm();
      prisma.delivery.updateMany.mockResolvedValue({ count: 0 }); // l'autre requête a déjà clos la mission
      await expect(service.confirm(5, 1, '123456')).rejects.toThrow(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(prisma.walletEntry.createMany).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('un mauvais code ne crédite rien', async () => {
      prisma.delivery.findUnique.mockResolvedValue(active());
      prisma.delivery.update.mockResolvedValue({ confirmAttempts: 1 });
      await expect(service.confirm(5, 1, '000000')).rejects.toThrow('Code de confirmation incorrect.');
      expect(prisma.walletEntry.createMany).not.toHaveBeenCalled();
    });

    it('ancienne commande sans répartition figée : seul le livreur est crédité, la livraison reste possible', async () => {
      armConfirm({ order: { confirmationCode: '123456', merchantAmount: 0, deliveryFee: 2000 } });
      await service.confirm(5, 1, '123456');
      expect(prisma.walletEntry.createMany).toHaveBeenCalledWith({
        data: [{ userId: 5, orderId: 9, type: 'LIVRAISON', amount: 2000, availableAt: expect.any(Date) }],
      });
    });
  });

  describe('reportFailure (échec de remise)', () => {
    const owned = (over: any = {}) => ({ id: 1, livreurId: 5, status: 'EN_COURS', orderId: 9, order: {}, ...over });

    beforeEach(() => {
      prisma.orderItem.findMany = jest.fn().mockResolvedValue([{ productId: 4, quantity: 3 }]);
      prisma.delivery.updateMany.mockResolvedValue({ count: 1 });
    });

    it('mission ECHEC, commande ECHOUEE avec historique, audit', async () => {
      prisma.delivery.findUnique
        .mockResolvedValueOnce(owned())
        .mockResolvedValueOnce({ id: 1, status: 'ECHEC' });

      const res = await service.reportFailure(5, 1);

      expect(res.status).toBe('ECHEC');
      expect(prisma.delivery.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: 'EN_COURS' },
        data: expect.objectContaining({ status: 'ECHEC' }),
      });
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 9 },
        data: { status: 'ECHOUEE', statusHistory: { create: { status: 'ECHOUEE' } } },
      }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 5, action: 'ORDER_STATUS_CHANGE', entityId: 9,
        previousValue: 'EN_COURS_DE_LIVRAISON', newValue: 'ECHOUEE',
      }));
    });

    it('restitue le stock de la commande', async () => {
      prisma.delivery.findUnique.mockResolvedValue(owned());
      await service.reportFailure(5, 1);
      expect(prisma.orderItem.findMany).toHaveBeenCalledWith({
        where: { orderId: 9 }, select: { productId: true, quantity: true },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: 4 }, data: { stock: { increment: 3 } } });
    });

    it('ne crédite personne : pas de livraison, pas de gain', async () => {
      prisma.delivery.findUnique.mockResolvedValue(owned());
      await service.reportFailure(5, 1);
      expect(prisma.walletEntry.createMany).not.toHaveBeenCalled();
    });

    it('double déclaration simultanée : la seconde est refusée, stock non restitué deux fois', async () => {
      prisma.delivery.findUnique.mockResolvedValue(owned());
      prisma.delivery.updateMany.mockResolvedValue({ count: 0 }); // l'autre requête a déjà clos la mission

      await expect(service.reportFailure(5, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('403 si la mission appartient à un autre livreur', async () => {
      prisma.delivery.findUnique.mockResolvedValue(owned({ livreurId: 6 }));
      await expect(service.reportFailure(5, 1)).rejects.toThrow(ForbiddenException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('refuse si la mission n’est plus EN_COURS (déjà livrée ou en échec)', async () => {
      prisma.delivery.findUnique.mockResolvedValue(owned({ status: 'LIVREE' }));
      await expect(service.reportFailure(5, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });
});
