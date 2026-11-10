import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';

describe('CartService.addItem : un panier = une boutique (BR-CMD-07)', () => {
  let prisma: any, service: CartService;

  // Boutique ouverte par défaut : validée, propriétaire actif.
  const OPEN_SHOP = { status: 'VALIDEE', owner: { accountStatus: 'ACTIF' } };
  const product = (over: any = {}) => ({ id: 10, shopId: 1, isActive: true, stock: 10, price: 5000, shop: OPEN_SHOP, ...over });

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn() },
      cart: { findUnique: jest.fn(), create: jest.fn() },
      cartItem: {
        findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
        create: jest.fn(), update: jest.fn(), deleteMany: jest.fn(),
      },
    };
    prisma.cart.findUnique.mockResolvedValue({ id: 7, userId: 1 });
    prisma.cartItem.findMany.mockResolvedValue([]);
    service = new CartService(prisma);
  });

  it('refuse (409) un produit d’une autre boutique, nomme la boutique du panier et n’écrit rien', async () => {
    prisma.product.findUnique.mockResolvedValue(product({ shopId: 2 }));
    prisma.cartItem.findFirst.mockResolvedValue({ product: { shop: { name: 'Épicerie du Lac' } } });

    const attempt = service.addItem(1, 10, 1);

    await expect(attempt).rejects.toThrow(ConflictException);
    await expect(attempt).rejects.toThrow(/Épicerie du Lac/);
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
    expect(prisma.cartItem.update).not.toHaveBeenCalled();
  });

  it('ne vide jamais le panier automatiquement', async () => {
    prisma.product.findUnique.mockResolvedValue(product({ shopId: 2 }));
    prisma.cartItem.findFirst.mockResolvedValue({ product: { shop: { name: 'Autre' } } });

    await expect(service.addItem(1, 10, 1)).rejects.toThrow(ConflictException);
    expect(prisma.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('cherche une ligne d’une AUTRE boutique dans CE panier', async () => {
    prisma.product.findUnique.mockResolvedValue(product({ shopId: 2 }));
    prisma.cartItem.findFirst.mockResolvedValue(null);
    prisma.cartItem.findUnique.mockResolvedValue(null);

    await service.addItem(1, 10, 1);

    expect(prisma.cartItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { cartId: 7, product: { shopId: { not: 2 } } },
    }));
  });

  it('accepte un produit de la même boutique (ou un panier vide)', async () => {
    prisma.product.findUnique.mockResolvedValue(product());
    prisma.cartItem.findFirst.mockResolvedValue(null);
    prisma.cartItem.findUnique.mockResolvedValue(null);

    await service.addItem(1, 10, 2);

    expect(prisma.cartItem.create).toHaveBeenCalledWith({ data: { cartId: 7, productId: 10, quantity: 2 } });
  });

  it('augmente la quantité d’une ligne déjà présente', async () => {
    prisma.product.findUnique.mockResolvedValue(product());
    prisma.cartItem.findFirst.mockResolvedValue(null);
    prisma.cartItem.findUnique.mockResolvedValue({ id: 3, quantity: 2 });

    await service.addItem(1, 10, 1);

    expect(prisma.cartItem.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { quantity: 3 } });
  });

  it('garde les autres refus : produit indisponible (404) et stock insuffisant (400)', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.addItem(1, 10, 1)).rejects.toThrow(NotFoundException);

    prisma.product.findUnique.mockResolvedValue(product({ stock: 1 }));
    await expect(service.addItem(1, 10, 5)).rejects.toThrow(BadRequestException);
    expect(prisma.cartItem.findFirst).not.toHaveBeenCalled();
  });
});

describe('CartService : boutique fermée (commerçant suspendu/désactivé ou boutique non validée)', () => {
  let prisma: any, service: CartService;

  const shop = (status: string, accountStatus: string) => ({ status, owner: { accountStatus } });
  const product = (s: any, over: any = {}) => ({ id: 10, shopId: 1, isActive: true, stock: 10, price: 5000, shop: s, ...over });

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn() },
      cart: { findUnique: jest.fn().mockResolvedValue({ id: 7, userId: 1 }), create: jest.fn() },
      cartItem: {
        findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(), update: jest.fn(), deleteMany: jest.fn(),
      },
    };
    service = new CartService(prisma);
  });

  it.each([
    ['propriétaire DESACTIVE', shop('VALIDEE', 'DESACTIVE')],
    ['propriétaire SUSPENDU', shop('VALIDEE', 'SUSPENDU')],
    ['boutique SUSPENDUE', shop('SUSPENDUE', 'ACTIF')],
    ['boutique non validée', shop('EN_ATTENTE_VALIDATION', 'ACTIF')],
  ])('addItem refuse (404) : %s, et n’écrit rien', async (_label, s) => {
    prisma.product.findUnique.mockResolvedValue(product(s));

    await expect(service.addItem(1, 10, 1)).rejects.toThrow(NotFoundException);
    expect(prisma.cartItem.create).not.toHaveBeenCalled();
    expect(prisma.cartItem.update).not.toHaveBeenCalled();
  });

  it('addItem charge la boutique avec le statut du propriétaire', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.addItem(1, 10, 1)).rejects.toThrow(NotFoundException);
    expect(prisma.product.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      include: { shop: { select: { status: true, owner: { select: { accountStatus: true } } } } },
    }));
  });

  it('getMine signale « indisponible » un produit dont la boutique est fermée', async () => {
    const line = (id: number, s: any) => ({ id, productId: id, quantity: 1, product: product(s, { id }) });
    prisma.cartItem.findMany.mockResolvedValue([
      line(1, shop('VALIDEE', 'ACTIF')),
      line(2, shop('VALIDEE', 'DESACTIVE')),
    ]);

    const res = await service.getMine(1);

    expect(res.items.map((i) => i.available)).toEqual([true, false]);
  });
});
