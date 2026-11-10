import { apiFetch } from "./api";
import type { Cart } from "@/types/cart";

export const getCart = () => apiFetch<Cart>("/cart");
export const addCartItem = (productId: number, quantity: number) =>
    apiFetch<Cart>("/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity }) });
export const updateCartItem = (productId: number, quantity: number) =>
    apiFetch<Cart>(`/cart/items/${productId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
export const removeCartItem = (productId: number) =>
    apiFetch<Cart>(`/cart/items/${productId}`, { method: "DELETE" });
export const clearCart = () => apiFetch<Cart>("/cart", { method: "DELETE" });