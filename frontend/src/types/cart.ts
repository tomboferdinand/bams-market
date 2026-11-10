import type { Product } from "./product";

export interface CartItem {
    id: number;
    productId: number;
    quantity: number;
    product: Product;
    lineTotal: number;
    available: boolean;
}

export interface Cart {
    items: CartItem[];
    subtotal: number;
    /** Montants officiels calculés par le serveur (BR-SEC-02). */
    deliveryFee: number;
    total: number;
    minOrderAmount: number;
    meetsMinimum: boolean;
}
