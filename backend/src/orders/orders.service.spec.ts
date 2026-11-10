import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService, MERCHANT_VISIBLE_STATUSES } from './orders.service';
import { makeAuditMock, makePrismaMock } from '../common/testing/mocks';
import { getCommissionPercent } from '../common/commission';

describe('OrdersService', () => {
  let prisma: any, cart: any, audit: any, service: OrdersService;

  beforeEach(() => {
    prisma = makePrismaMock();
    audit = makeAuditMock();
    cart = { getMine: jest.fn(), clear: jest.fn() };
    service = new OrdersService(prisma, cart, audit);
  });

  const item = (price: number, qty: number, over: any = {}) => ({
    productId: 1, quantity: qty,
    product: { name: 'Riz', price, stock: 100, isActive: true, shopId: 1, ...over },
  });

  describe('create', () => {
    beforeEach(() => {
      // par défaut, la réservation de stock réussit
      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      // par défaut, la boutique du panier est ouverte (validée, commerçant actif)
      prisma.shop.count.mockResolvedValue(1);
    });

    it("refuse une adresse qui n'appartient pas au client", async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 1, userId: 99 });
      await expect(service.create(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('refuse un panier vide', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      cart.getMine.mockResolvedValue({ items: [] });
      await expect(service.create(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('refuse un panier mêlant plusieurs boutiques, sans réserver de stock (BR-CMD-07)', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      cart.getMine.mockResolvedValue({
        items: [item(5000, 1, { shopId: 1 }), { ...item(5000, 1, { shopId: 2 }), productId: 2 }],
      });

      await expect(service.create(1, 1)).rejects.toThrow(/plusieurs boutiques/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.product.updateMany).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('accepte plusieurs lignes de la même boutique (BR-CMD-07)', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      cart.getMine.mockResolvedValue({
        items: [item(5000, 1, { shopId: 3 }), { ...item(4000, 1, { shopId: 3 }), productId: 2 }],
      });
      prisma.order.create.mockResolvedValue({ id: 10 });

      await service.create(1, 1);

      expect(prisma.order.create).toHaveBeenCalledTimes(1);
    });

    it('refuse la commande si la boutique est fermée (commerçant suspendu ou désactivé), sans réserver de stock', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      cart.getMine.mockResolvedValue({ items: [item(5000, 1, { shopId: 4 })] });
      prisma.shop.count.mockResolvedValue(0);

      await expect(service.create(1, 1)).rejects.toThrow(/plus disponible à la vente/);
      expect(prisma.shop.count).toHaveBeenCalledWith({
        where: { id: { in: [4] }, status: 'VALIDEE', owner: { accountStatus: 'ACTIF' } },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
      expect(cart.clear).not.toHaveBeenCalled();
    });

    it('refuse un produit inactif ou en stock insuffisant (BR-PRD-03)', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      cart.getMine.mockResolvedValue({ items: [item(5000, 5, { stock: 2 })] });
      await expect(service.create(1, 1)).rejects.toThrow(BadRequestException);
      cart.getMine.mockResolvedValue({ items: [item(5000, 1, { isActive: false })] });
      await expect(service.create(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('refuse un sous-total sous le minimum (BR-CMD-01)', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      cart.getMine.mockResolvedValue({ items: [item(500, 1)] });
      await expect(service.create(1, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('crée la commande : total, code 6 chiffres, snapshot prix, historique, panier vidé', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      cart.getMine.mockResolvedValue({ items: [item(5000, 2), item(3000, 1)] });
      prisma.order.create.mockImplementation(async ({ data }: any) => ({ id: 10, ...data }));

      await service.create(1, 1);

      const data = prisma.order.create.mock.calls[0][0].data;
      expect(data.subtotal).toBe(13000);
      expect(data.total).toBe(13000 + data.deliveryFee);
      expect(data.confirmationCode).toMatch(/^\d{6}$/);
      // BR-PAY-04 : répartition figée, commission calculée sur le sous-total uniquement
      expect(data.commissionPercent).toBe(getCommissionPercent());
      expect(data.commissionAmount).toBe(Math.round((13000 * getCommissionPercent()) / 100));
      expect(data.merchantAmount).toBe(13000 - data.commissionAmount);
      expect(data.items.create[0]).toMatchObject({ productId: 1, quantity: 2, unitPrice: 5000 });
      expect(data.statusHistory.create).toEqual({ status: 'EN_ATTENTE_PAIEMENT' });
      expect(cart.clear).toHaveBeenCalledWith(1);
    });

    it('réserve le stock de la ligne dans la transaction de création (BR-PRD-04)', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      cart.getMine.mockResolvedValue({ items: [item(5000, 2)] });
      prisma.order.create.mockResolvedValue({ id: 10 });

      await service.create(1, 1);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 1, isActive: true, stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
    });

    it('annule tout si le stock a été pris entre-temps (course entre deux clients)', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      cart.getMine.mockResolvedValue({ items: [item(5000, 2)] });
      prisma.product.updateMany.mockResolvedValue({ count: 0 }); // le dernier exemplaire est parti

      await expect(service.create(1, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
      expect(cart.clear).not.toHaveBeenCalled();
    });
  });

  describe('findOneMine / cancel', () => {
    it('ne montre jamais au client la part de la plateforme (commission)', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      prisma.order.findMany.mockResolvedValue([]);
      await service.findOneMine(1, 1);
      await service.findMine(1);
      for (const call of [prisma.order.findUnique.mock.calls[0], prisma.order.findMany.mock.calls[0]]) {
        expect(call[0].omit).toEqual({ commissionPercent: true, commissionAmount: true, merchantAmount: true });
      }
    });

    it("findMine renvoie l'historique des statuts (la liste distingue livraison échouée / paiement échoué)", async () => {
      prisma.order.findMany.mockResolvedValue([]);
      await service.findMine(1);
      const arg = prisma.order.findMany.mock.calls[0][0];
      expect(arg.where).toEqual({ userId: 1 });
      expect(arg.include.statusHistory).toBe(true);
      expect(arg.include.refund).toBeDefined(); // le client voit s'il a été remboursé
    });

    it("refuse l'accès à la commande d'un autre client (BR-SEC-03)", async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, userId: 2 });
      await expect(service.findOneMine(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('404 si commande inexistante', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.findOneMine(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('refuse d’annuler une commande déjà payée (BR-CMD-03)', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, userId: 1, status: 'PAYEE', items: [] });
      await expect(service.cancel(1, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('annule une commande en attente, échoue le paiement en attente, restitue le stock et journalise', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 1, userId: 1, status: 'EN_ATTENTE_PAIEMENT', items: [{ productId: 4, quantity: 3 }],
      });
      prisma.order.updateMany.mockResolvedValue({ count: 1 });
      prisma.product.updateMany.mockResolvedValue({ count: 1 });

      await service.cancel(1, 1);

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 1, status: 'EN_ATTENTE_PAIEMENT' }, data: { status: 'ANNULEE' },
      });
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { statusHistory: { create: { status: 'ANNULEE' } } },
      }));
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId: 1, status: 'EN_ATTENTE' }, data: { status: 'ECHOUEE' },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 4 }, data: { stock: { increment: 3 } },
      });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'ORDER_STATUS_CHANGE', previousValue: 'EN_ATTENTE_PAIEMENT', newValue: 'ANNULEE',
      }));
    });

    it('ne restitue pas le stock deux fois si une expiration est passée en premier', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 1, userId: 1, status: 'EN_ATTENTE_PAIEMENT', items: [{ productId: 4, quantity: 3 }],
      });
      prisma.order.updateMany.mockResolvedValue({ count: 0 }); // déjà traitée par ailleurs

      await expect(service.cancel(1, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe('espace commerçant (US-012)', () => {
    it('exclut les commandes non payées, annulées ou échouées', () => {
      expect(MERCHANT_VISIBLE_STATUSES).toEqual(['PAYEE', 'EN_PREPARATION', 'EN_COURS_DE_LIVRAISON', 'LIVREE']);
      for (const s of ['EN_ATTENTE_PAIEMENT', 'ANNULEE', 'ECHOUEE']) {
        expect(MERCHANT_VISIBLE_STATUSES).not.toContain(s);
      }
    });

    it('findForMerchant : 404 sans boutique', async () => {
      prisma.shop.findUnique.mockResolvedValue(null);
      await expect(service.findForMerchant(1)).rejects.toThrow(NotFoundException);
    });

    it('findForMerchant : filtre statuts payés + lignes de sa boutique uniquement', async () => {
      prisma.shop.findUnique.mockResolvedValue({ id: 7 });
      prisma.order.findMany.mockResolvedValue([]);
      await service.findForMerchant(1);
      const arg = prisma.order.findMany.mock.calls[0][0];
      expect(arg.where).toEqual({
        status: { in: MERCHANT_VISIBLE_STATUSES },
        items: { some: { product: { shopId: 7 } } },
      });
      expect(arg.include.items.where).toEqual({ product: { shopId: 7 } });
    });

    it('findOneForMerchant : 404 si introuvable ou non payée', async () => {
      prisma.shop.findUnique.mockResolvedValue({ id: 7 });
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.findOneForMerchant(1, 5)).rejects.toThrow(NotFoundException);
      expect(prisma.order.findFirst.mock.calls[0][0].where).toMatchObject({
        id: 5, status: { in: MERCHANT_VISIBLE_STATUSES },
      });
    });

    it('markAsPreparing : refuse si pas PAYEE', async () => {
      prisma.shop.findUnique.mockResolvedValue({ id: 7 });
      prisma.order.findFirst.mockResolvedValue({ id: 5, status: 'EN_PREPARATION' });
      await expect(service.markAsPreparing(1, 5)).rejects.toThrow(BadRequestException);
      expect(prisma.delivery.create).not.toHaveBeenCalled();
    });

    it('markAsPreparing : passe en préparation, crée la livraison, journalise', async () => {
      prisma.shop.findUnique.mockResolvedValue({ id: 1, ownerId: 1 });
      prisma.order.findFirst
        .mockResolvedValueOnce({ id: 5, status: 'PAYEE', items: [] })
        .mockResolvedValueOnce({ id: 5, status: 'EN_PREPARATION', items: [] });
      prisma.order.update.mockResolvedValue({ id: 5 });
      prisma.delivery.create.mockResolvedValue({ id: 1, orderId: 5 });
      const res = await service.markAsPreparing(1, 5);
      expect(res.status).toBe('EN_PREPARATION');
      expect(prisma.delivery.create).toHaveBeenCalledWith({ data: { orderId: 5 } });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ newValue: 'EN_PREPARATION' }));
    });
  });
});
