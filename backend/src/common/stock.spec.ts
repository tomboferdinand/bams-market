import { releaseStock, reserveStock } from './stock';

describe('stock (BR-PRD-04)', () => {
  let tx: any;

  beforeEach(() => {
    tx = { product: { updateMany: jest.fn(), update: jest.fn() } };
  });

  describe('reserveStock', () => {
    it('décrémente chaque ligne avec la condition stock suffisant, et marque la rupture à zéro', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      const failed = await reserveStock(tx, [{ productId: 4, quantity: 2 }]);

      expect(failed).toBeNull();
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 4, isActive: true, stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 4, stock: 0 },
        data: { status: 'RUPTURE_DE_STOCK' },
      });
    });

    it('renvoie la ligne en cause et s’arrête quand le stock est insuffisant', async () => {
      tx.product.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      const lines = [{ productId: 1, quantity: 1 }, { productId: 2, quantity: 5 }, { productId: 3, quantity: 1 }];

      const failed = await reserveStock(tx, lines);

      expect(failed).toEqual({ productId: 2, quantity: 5 });
      const touched = tx.product.updateMany.mock.calls.map((c: any[]) => c[0].where.id);
      expect(touched).not.toContain(3);
    });
  });

  describe('releaseStock', () => {
    it('restitue la quantité et remet le produit disponible si le stock redevient positif', async () => {
      tx.product.updateMany.mockResolvedValue({ count: 1 });
      await releaseStock(tx, [{ productId: 4, quantity: 3 }]);

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 4 }, data: { stock: { increment: 3 } },
      });
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 4, status: 'RUPTURE_DE_STOCK', stock: { gt: 0 } },
        data: { status: 'DISPONIBLE' },
      });
    });

    it('ne fait rien sans ligne', async () => {
      await releaseStock(tx, []);
      expect(tx.product.update).not.toHaveBeenCalled();
    });
  });
});
