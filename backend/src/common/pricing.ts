// Source unique des règles de prix d'une commande (BR-CMD-01, BR-SEC-02).
// Le panier et la création de commande utilisent ces mêmes fonctions :
// le client voit exactement les montants que le serveur appliquera.
//
// Les valeurs sont lues à l'appel (et non à l'import) pour rester configurables
// par variables d'environnement et testables.

export const getMinOrderAmount = () => Number(process.env.MIN_ORDER_AMOUNT ?? 2000);
export const getDeliveryFee = () => Number(process.env.DELIVERY_FEE ?? 2000);

export interface OrderTotals {
    subtotal: number;
    deliveryFee: number;
    total: number;
    minOrderAmount: number;
    meetsMinimum: boolean;
}

export function computeOrderTotals(subtotal: number): OrderTotals {
    const minOrderAmount = getMinOrderAmount();
    // Pas de frais de livraison sur un panier vide.
    const deliveryFee = subtotal > 0 ? getDeliveryFee() : 0;
    return {
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        minOrderAmount,
        meetsMinimum: subtotal >= minOrderAmount, // BR-CMD-01
    };
}
