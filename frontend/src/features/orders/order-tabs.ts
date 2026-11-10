import type { Order } from "@/types/order";

export type OrderTab = "active" | "done" | "closed";

export const TAB_LABEL: Record<OrderTab, string> = {
    active: "En cours",
    done: "Terminées",
    closed: "Annulées / échouées",
};

// Doit rester aligné avec ORDER_UNPAID_EXPIRATION_MINUTES côté backend (30 par défaut).
export const UNPAID_EXPIRATION_MINUTES = 30;

export function orderTab(status: Order["status"]): OrderTab {
    if (status === "LIVREE") return "done";
    if (status === "ANNULEE" || status === "ECHOUEE") return "closed";
    return "active";
}

/** Heure limite avant annulation automatique d'une commande non payée. */
export function unpaidDeadline(createdAt: string): Date {
    return new Date(new Date(createdAt).getTime() + UNPAID_EXPIRATION_MINUTES * 60_000);
}
