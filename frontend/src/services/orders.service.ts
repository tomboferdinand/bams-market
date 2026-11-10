import { apiFetch } from "./api";
import type { Order } from "@/types/order";
import type { MerchantOrder } from "@/types/order";

export const createOrder = (addressId: number) =>
    apiFetch<Order>("/orders", { method: "POST", body: JSON.stringify({ addressId }) });

export const getOrders = () => apiFetch<Order[]>("/orders");

export const getOrder = (id: number) => apiFetch<Order>(`/orders/${id}`);

export const cancelOrder = (id: number) =>
    apiFetch<Order>(`/orders/${id}/cancel`, { method: "PATCH" });



export const getMerchantOrders = () => apiFetch<MerchantOrder[]>("/orders/merchant/all");
export const getMerchantOrder = (id: number) => apiFetch<MerchantOrder>(`/orders/merchant/${id}`);
export const markOrderAsPreparing = (id: number) =>
  apiFetch<MerchantOrder>(`/orders/${id}/prepare`, { method: "PATCH" });