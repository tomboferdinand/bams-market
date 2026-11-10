import { apiFetch } from "./api";
import type { Address } from "@/types/address";

export const getAddresses = () => apiFetch<Address[]>("/addresses");
export const createAddress = (data: { label: string; fullAddress: string; phone: string; isDefault?: boolean }) =>
    apiFetch<Address>("/addresses", { method: "POST", body: JSON.stringify(data) });
export const deleteAddress = (id: number) => apiFetch<void>(`/addresses/${id}`, { method: "DELETE" });