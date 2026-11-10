import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService – données boutique en accès public (BR-SEC-06)', () => {
  let prisma: any, service: ProductsService;

  beforeEach(() => {
    prisma = { product: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() } };
    service = new ProductsService(prisma, {} as any, {} as any);
  });

  it('le catalogue public ne renvoie que id, nom et logo de la boutique', async () => {
    await service.findPublicCatalogue();
    const shop = prisma.product.findMany.mock.calls[0][0].include.shop;
    expect(shop).toEqual({ select: { id: true, name: true, logoUrl: true } });
  });

  it("le détail public ne renvoie ni adresse ni téléphone de la boutique", async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 1 });
    await service.findPublicDetail(1);
    const shop = prisma.product.findFirst.mock.calls[0][0].include.shop;
    expect(shop).toEqual({ select: { id: true, name: true, logoUrl: true } });
    expect(JSON.stringify(shop)).not.toContain('contactPhone');
    expect(JSON.stringify(shop)).not.toContain('address');
  });

  it('404 si produit introuvable ou boutique non validée', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(service.findPublicDetail(9)).rejects.toThrow(NotFoundException);
  });
});
