import { WalletService } from './wallet.service';
import { makePrismaMock } from '../common/testing/mocks';

describe('WalletService', () => {
  it('renvoie le solde, la part retirable et les derniers mouvements de l’utilisateur', async () => {
    const prisma: any = makePrismaMock();
    const entries = [{ id: 2, type: 'LIVRAISON', amount: 2000, orderId: 9, payoutId: null, availableAt: new Date(), createdAt: new Date() }];
    prisma.walletEntry.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 11000 } }) // solde total
      .mockResolvedValueOnce({ _sum: { amount: 9000 } }); // part déjà retirable
    prisma.walletEntry.findMany.mockResolvedValue(entries);

    const res = await new WalletService(prisma).getMine(5);

    expect(res).toEqual({ balance: 11000, available: 9000, entries });
    expect(prisma.walletEntry.aggregate).toHaveBeenCalledWith({ where: { userId: 5 }, _sum: { amount: true } });
    expect(prisma.walletEntry.aggregate).toHaveBeenCalledWith({
      where: { userId: 5, availableAt: { lte: expect.any(Date) } }, _sum: { amount: true },
    });
    expect(prisma.walletEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 5 } }));
  });

  it('solde 0 quand aucun mouvement', async () => {
    const prisma: any = makePrismaMock();
    prisma.walletEntry.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.walletEntry.findMany.mockResolvedValue([]);
    expect(await new WalletService(prisma).getMine(5)).toEqual({ balance: 0, available: 0, entries: [] });
  });
});
