import { ProductsService } from './products.service';

describe('ProductsService.findMine : quantité vendue', () => {
  let prisma: any, shops: any, service: ProductsService;

  beforeEach(() => {
    prisma = {
      product: { findMany: jest.fn() },
      orderItem: { groupBy: jest.fn() },
    };
    shops = { findMine: jest.fn().mockResolvedValue({ id: 7 }) };
    service = new ProductsService(prisma, {} as any, shops);
  });

  it('ajoute soldQuantity à partir des seules commandes livrées', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 1, name: 'Riz' }, { id: 2, name: 'Savon' }]);
    prisma.orderItem.groupBy.mockResolvedValue([{ productId: 1, _sum: { quantity: 5 } }]);

    const res = await service.findMine(3);

    expect(res).toEqual([
      { id: 1, name: 'Riz', soldQuantity: 5 },
      { id: 2, name: 'Savon', soldQuantity: 0 },
    ]);
    expect(prisma.product.findMany.mock.calls[0][0].where).toEqual({ shopId: 7 });
    expect(prisma.orderItem.groupBy).toHaveBeenCalledWith({
      by: ['productId'],
      where: { productId: { in: [1, 2] }, order: { status: 'LIVREE' } },
      _sum: { quantity: true },
    });
  });

  it('sans produit : aucune requête de ventes', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    expect(await service.findMine(3)).toEqual([]);
    expect(prisma.orderItem.groupBy).not.toHaveBeenCalled();
  });
});
