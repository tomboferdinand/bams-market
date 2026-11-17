import type { MerchantOrder, OrderStatus } from "@/types/order";
import type { Product } from "@/types/product";

// Commandes dont le paiement est confirmé
export const PAID_STATUSES: OrderStatus[] = [
  "PAYEE",
  "EN_PREPARATION",
  "EN_COURS_DE_LIVRAISON",
  "LIVREE",
];

/** Montant de la part du commerçant : le backend ne renvoie que les articles de sa boutique. */
export function shopAmount(order: MerchantOrder) {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

/**
 * Passage des ventes brutes aux gains nets, à partir de la répartition figée sur chaque commande
 * par le backend (aucun recalcul de la commission ici). Le taux n'est affiché que s'il est le même
 * pour toutes les commandes (il peut avoir changé entre deux commandes).
 */
export function computeEarnings(paid: MerchantOrder[]) {
  const gross = paid.reduce((sum, o) => sum + shopAmount(o), 0);
  const commission = paid.reduce((sum, o) => sum + (o.commissionAmount ?? 0), 0);
  const net = paid.reduce((sum, o) => sum + (o.merchantAmount ?? shopAmount(o) - (o.commissionAmount ?? 0)), 0);
  const rates = new Set(paid.map((o) => o.commissionPercent).filter((r): r is number => typeof r === "number"));
  return { gross, commission, net, commissionPercent: rates.size === 1 ? [...rates][0] : null };
}

export function computeMerchantStats(products: Product[], orders: MerchantOrder[]) {
  // Dédoublonnage défensif par identifiant de commande
  const unique = Array.from(new Map(orders.map((o) => [o.id, o])).values());
  const paid = unique.filter((o) => PAID_STATUSES.includes(o.status));
  const recentOrders = [...paid]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    activeProducts: products.filter((p) => p.isActive).length,
    outOfStock: products.filter((p) => p.isActive && p.status === "RUPTURE_DE_STOCK").length,
    paidOrders: paid.length,
    toPrepare: paid.filter((o) => o.status === "PAYEE").length,
    revenue: paid.reduce((sum, o) => sum + shopAmount(o), 0),
    recentOrders,
    earnings: computeEarnings(paid),
  };
}