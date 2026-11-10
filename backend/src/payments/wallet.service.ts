import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Nombre de mouvements renvoyés avec le solde (les plus récents d'abord).
const HISTORY_SIZE = 50;

/**
 * Solde et historique de l'utilisateur connecté (commerçant ou livreur).
 *  - balance   : somme du livre de comptes (crédits à la livraison confirmée, retraits en négatif) ;
 *  - available : part retirable, c'est-à-dire dont le délai de séjour après livraison est écoulé.
 */
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: number) {
    const [total, available, entries] = await Promise.all([
      this.prisma.walletEntry.aggregate({ where: { userId }, _sum: { amount: true } }),
      this.prisma.walletEntry.aggregate({ where: { userId, availableAt: { lte: new Date() } }, _sum: { amount: true } }),
      this.prisma.walletEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_SIZE,
        select: { id: true, type: true, amount: true, orderId: true, payoutId: true, availableAt: true, createdAt: true },
      }),
    ]);
    return { balance: total._sum.amount ?? 0, available: available._sum.amount ?? 0, entries };
  }
}
