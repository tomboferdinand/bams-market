import type { Order } from "@/types/order";

export type FailureKind = "delivery" | "payment" | "cancelled";

/**
 * Pourquoi une commande est terminée sans être livrée.
 *  - "cancelled" : annulée par le client avant paiement ;
 *  - "payment"   : le paiement a échoué (le client n'a rien payé) ;
 *  - "delivery"  : la livraison a échoué APRÈS paiement (client absent ou injoignable) :
 *                  le client a payé, un remboursement est à traiter par l'administration.
 * Renvoie null pour une commande qui suit son cours normal.
 */
export function failureKind(order: Pick<Order, "status" | "statusHistory">): FailureKind | null {
  if (order.status === "ANNULEE") return "cancelled";
  if (order.status !== "ECHOUEE") return null;
  return (order.statusHistory ?? []).some((h) => h.status === "PAYEE") ? "delivery" : "payment";
}
