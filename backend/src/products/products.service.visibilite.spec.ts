import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService : visibilité publique (boutique ouverte)', () => {
  let prisma: any, service: ProductsService;
  const OPEN = { status: 'VALIDEE', owner: { accountStatus: 'ACTIF' } };

  beforeEach(() => {
    prisma = { product: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() } };
    service = new ProductsService(prisma, {} as any, {} as any);
  });

  it('le catalogue ne montre que les produits actifs de boutiques validées dont le propriétaire est actif', async () => {
    await service.findPublicCatalogue();
    const where = prisma.product.findMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(where.shop).toEqual(OPEN);
  });

  it('le catalogue garde les filtres de recherche et de catégorie', async () => {
    await service.findPublicCatalogue('riz', 3);
    const where = prisma.product.findMany.mock.calls[0][0].where;
    expect(where.shop).toEqual(OPEN);
    expect(where.categoryId).toBe(3);
    expect(where.name).toEqual({ contains: 'riz', mode: 'insensitive' });
  });

  it('la page produit applique la même règle', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 5 });
    await service.findPublicDetail(5);
    expect(prisma.product.findFirst.mock.calls[0][0].where).toEqual({ id: 5, isActive: true, shop: OPEN });
  });

  it('la page produit d’une boutique fermée renvoie 404', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(service.findPublicDetail(5)).rejects.toThrow(NotFoundException);
  });
});
