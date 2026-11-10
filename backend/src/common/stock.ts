import type { PrismaService } from '../database/prisma.service';

/**
 * Réservation du stock (BR-PRD-04).
 *
 * Le stock est décrémenté à la création de la commande (réservation), puis restitué si la commande
 * est annulée, échoue ou expire. Ces fonctions s'utilisent TOUJOURS à l'intérieur d'une transaction
 * Prisma interactive (le paramètre `tx`), pour que la réservation et la commande soient atomiques.
 */
export interface StockLine {
  productId: number;
  quantity: number;
}

type StockTx = Pick<PrismaService, 'product'>;

/**
 * Réserve le stock de chaque ligne. La condition `stock >= quantité` est portée par la requête
 * elle-même : deux commandes simultanées ne peuvent pas prendre le dernier exemplaire.
 * Renvoie la première ligne impossible à réserver (l'appelant doit alors annuler la transaction),
 * ou null si tout est réservé.
 */
export async function reserveStock(tx: StockTx, lines: StockLine[]): Promise<StockLine | null> {
  for (const line of lines) {
    const res = await tx.product.updateMany({
      where: { id: line.productId, isActive: true, stock: { gte: line.quantity } },
      data: { stock: { decrement: line.quantity } },
    });
    if (res.count === 0) return line;

    // BR-PRD-03 : un stock à zéro passe le produit en rupture.
    await tx.product.updateMany({
      where: { id: line.productId, stock: 0 },
      data: { status: 'RUPTURE_DE_STOCK' },
    });
  }
  return null;
}

/** Restitue le stock réservé (annulation, échec ou expiration d'une commande). */
export async function releaseStock(tx: StockTx, lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    await tx.product.update({
      where: { id: line.productId },
      data: { stock: { increment: line.quantity } },
    });
    await tx.product.updateMany({
      where: { id: line.productId, status: 'RUPTURE_DE_STOCK', stock: { gt: 0 } },
      data: { status: 'DISPONIBLE' },
    });
  }
}
