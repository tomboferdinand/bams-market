import { addCartItem } from "@/services/cart.service";
import type { Order } from "@/types/order";

export interface ReorderResult {
  added: number;
  skipped: string[];
}

/** Remet dans le panier les articles d'une commande (revalidation stock par l'API). */
export async function reorderItems(order: Pick<Order, "items">): Promise<ReorderResult> {
  let added = 0;
  const skipped: string[] = [];
  for (const item of order.items) {
    try {
      await addCartItem(item.productId, item.quantity);
      added += 1;
    } catch {
      skipped.push(item.product.name);
    }
  }
  return { added, skipped };
}