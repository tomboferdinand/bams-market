import { apiFetch } from "./api";
import type { Delivery } from "@/types/delivery";

export const getAvailableMissions = () => apiFetch<Delivery[]>("/deliveries/available");
export const getMyDeliveries = () => apiFetch<Delivery[]>("/deliveries/mine");
export const getDeliveryHistory = () => apiFetch<Delivery[]>("/deliveries/history");
export const acceptMission = (id: number) => apiFetch<Delivery>(`/deliveries/${id}/accept`, { method: "PATCH" });
export const confirmDelivery = (id: number, confirmationCode: string) =>
  apiFetch<Delivery>(`/deliveries/${id}/confirm`, { method: "PATCH", body: JSON.stringify({ confirmationCode }) });
export const reportDeliveryFailure = (id: number) =>
  apiFetch<Delivery>(`/deliveries/${id}/fail`, { method: "PATCH" });