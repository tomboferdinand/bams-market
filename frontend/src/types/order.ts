export type OrderStatus =
    | "EN_ATTENTE_PAIEMENT" | "PAYEE" | "EN_PREPARATION"
    | "EN_COURS_DE_LIVRAISON" | "LIVREE" | "ANNULEE" | "ECHOUEE";

export interface OrderItem {
    id: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    product: { id: number; name: string; imageUrl: string | null };
}

export interface OrderStatusEntry {
    id: number;
    status: OrderStatus;
    changedAt: string;
}

export interface Order {
    id: number;
    status: OrderStatus;
    subtotal: number;
    deliveryFee: number;
    total: number;
    items: OrderItem[];
    address: { id: number; label: string; fullAddress: string; phone: string };
    statusHistory: OrderStatusEntry[];
    confirmationCode?: string | null;
    createdAt: string;
    /** Présent une fois la commande remboursée par l'administration (livraison échouée après paiement). */
    refund?: { amount: number; createdAt: string } | null;
}

// BR-SEC-06 : le commerçant ne reçoit jamais le téléphone ni l'adresse exacte du client.
// Il voit le prénom, l'initiale du nom, la ville et le libellé de l'adresse.
export interface MerchantOrder extends Omit<Order, "address"> {
  address: { id: number; label: string; city: string };
  user: { firstName: string; lastName: string };
}
