import type { MerchantOrder } from "@/types/order";

/**
 * Livreur affiché au commerçant sur le détail d'une commande : prénom et nom seulement,
 * ou « En attente d'un livreur » tant qu'aucun livreur n'a accepté la mission.
 */
export function courierLabel(order: Pick<MerchantOrder, "assignedCourier">): string {
  const c = order.assignedCourier;
  return c ? `Livreur assigné : ${c.firstName} ${c.lastName}` : "En attente d'un livreur";
}
