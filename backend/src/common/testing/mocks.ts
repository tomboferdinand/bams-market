/* eslint-disable @typescript-eslint/no-explicit-any */
const model = () => ({
  findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
  create: jest.fn(), update: jest.fn(), updateMany: jest.fn(),
  upsert: jest.fn(), count: jest.fn(), aggregate: jest.fn(), createMany: jest.fn(),
});

export function makePrismaMock() {
  const prisma: any = {
    order: model(), address: model(), payment: model(),
    delivery: model(), shop: model(), user: model(),
    product: model(), orderItem: model(), walletEntry: model(), payout: model(),
  };
  // par défaut, une commande n'a aucune ligne à restituer au stock
  prisma.orderItem.findMany.mockResolvedValue([]);
  // $transaction accepte les deux formes de Prisma :
  //  - un tableau d'opérations (déjà des valeurs/promesses mockées) ;
  //  - une fonction interactive, exécutée avec le client mocké lui-même (« tx »).
  prisma.$transaction = jest.fn(async (arg: any) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
  );
  return prisma;
}

export const makeAuditMock = () => ({ log: jest.fn(), findAll: jest.fn() }) as any;
