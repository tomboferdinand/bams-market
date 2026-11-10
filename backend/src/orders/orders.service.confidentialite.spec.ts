import { OrdersService } from './orders.service';
import { makePrismaMock, makeAuditMock } from '../common/testing/mocks';

describe('OrdersService – confidentialité du code de confirmation (BR-LIV-04) et périmètre boutique (BR-SEC-03)', () => {
  let prisma: any;
  let service: OrdersService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new OrdersService(prisma, {} as any, makeAuditMock() as any);
    prisma.shop.findUnique.mockResolvedValue({ id: 1, ownerId: 10 });
  });

  it('la liste commerçant exclut confirmationCode', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    await service.findForMerchant(10);
    expect(prisma.order.findMany.mock.calls[0][0].omit).toEqual({ confirmationCode: true });
  });

  it('le détail commerçant exclut confirmationCode', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 5, status: 'PAYEE' });
    await service.findOneForMerchant(10, 5);
    expect(prisma.order.findFirst.mock.calls[0][0].omit).toEqual({ confirmationCode: true });
  });

  it('markAsPreparing : la transaction ne contient que des écritures (pas de lecture jointe)', async () => {
    prisma.order.findFirst
      .mockResolvedValueOnce({ id: 5, status: 'PAYEE', items: [] })
      .mockResolvedValueOnce({ id: 5, status: 'EN_PREPARATION', items: [] });
    prisma.order.update.mockResolvedValue({ id: 5 });
    prisma.delivery.create.mockResolvedValue({ id: 1 });

    await service.markAsPreparing(10, 5);

    const updateArgs = prisma.order.update.mock.calls[0][0];
    expect(updateArgs.include).toBeUndefined();
    expect(updateArgs.select).toEqual({ id: true });
    expect(prisma.delivery.create).toHaveBeenCalledWith({ data: { orderId: 5 } });
  });

  it('markAsPreparing renvoie la commande relue : sans confirmationCode, articles de la boutique seulement', async () => {
    const mesArticles = [{ id: 1, productId: 1, quantity: 1, unitPrice: 5000, product: { name: 'A' } }];
    prisma.order.findFirst
      .mockResolvedValueOnce({ id: 5, status: 'PAYEE', items: mesArticles })
      .mockResolvedValueOnce({ id: 5, status: 'EN_PREPARATION', items: mesArticles });
    prisma.order.update.mockResolvedValue({ id: 5 });
    prisma.delivery.create.mockResolvedValue({ id: 1 });

    const result = await service.markAsPreparing(10, 5);

    const relecture = prisma.order.findFirst.mock.calls[1][0];
    expect(relecture.omit).toEqual({ confirmationCode: true });
    expect(relecture.include.items.where).toEqual({ product: { shopId: 1 } });
    expect(result.status).toBe('EN_PREPARATION');
    expect(result.items).toEqual(mesArticles);
  });

  it('markAsPreparing refuse une commande qui n\'est pas payée', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 5, status: 'EN_PREPARATION', items: [] });
    await expect(service.markAsPreparing(10, 5)).rejects.toThrow('Seule une commande payée');
    expect(prisma.delivery.create).not.toHaveBeenCalled();
  });

  it('le client propriétaire reçoit bien son code', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 5, userId: 3, confirmationCode: '123456', status: 'PAYEE' });
    const order = await service.findOneMine(3, 5);
    expect(order.confirmationCode).toBe('123456');
  });

  describe('minimisation des données client (BR-SEC-06)', () => {
    const rawOrder = {
      id: 5, status: 'PAYEE', items: [],
      address: { id: 2, label: 'Maison', city: 'Fianarantsoa' },
      user: { firstName: 'Rina', lastName: 'Andrianjara' },
    };

    it('la liste commerçant ne demande ni téléphone ni adresse exacte', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      await service.findForMerchant(10);
      const include = prisma.order.findMany.mock.calls[0][0].include;
      expect(include.address).toEqual({ select: { id: true, label: true, city: true } });
      expect(include.user).toEqual({ select: { firstName: true, lastName: true } });
    });

    it('le détail commerçant ne demande ni téléphone ni adresse exacte', async () => {
      prisma.order.findFirst.mockResolvedValue({ ...rawOrder });
      await service.findOneForMerchant(10, 5);
      const include = prisma.order.findFirst.mock.calls[0][0].include;
      expect(include.address).toEqual({ select: { id: true, label: true, city: true } });
      expect(include.user).toEqual({ select: { firstName: true, lastName: true } });
    });

    it("le nom de famille est réduit à l'initiale", async () => {
      prisma.order.findMany.mockResolvedValue([{ ...rawOrder }]);
      const [order] = await service.findForMerchant(10);
      expect(order.user).toEqual({ firstName: 'Rina', lastName: 'A' });
      prisma.order.findFirst.mockResolvedValue({ ...rawOrder });
      const one = await service.findOneForMerchant(10, 5);
      expect(one.user).toEqual({ firstName: 'Rina', lastName: 'A' });
    });
  });
});
