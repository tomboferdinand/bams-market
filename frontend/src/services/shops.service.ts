import { apiFetch, ApiError } from "./api";
import type { Shop } from "@/types/shop";
import type { AdminShop } from "@/types/admin";
import type { ShopStatus } from "@/types/shop";

export async function getMyShop(): Promise<Shop | null> {
    try {
        return await apiFetch<Shop>("/shops/me");
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
}

export async function createShop(formData: FormData): Promise<Shop> {
    return apiFetch<Shop>("/shops", { method: "POST", body: formData });
}

export async function updateShop(formData: FormData): Promise<Shop> {
    return apiFetch<Shop>("/shops/me", { method: "PATCH", body: formData });
}

export const getAllShopsForAdmin = () => apiFetch<AdminShop[]>("/shops");
export const updateShopStatus = (id: number, status: ShopStatus) =>
  apiFetch<Shop>(`/shops/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });