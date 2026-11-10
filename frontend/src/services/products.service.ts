import { apiFetch } from "./api";
import type { Product } from "@/types/product";

export async function getCatalogue(params?: { search?: string; categoryId?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.categoryId) query.set("categoryId", String(params.categoryId));
    const qs = query.toString();
    return apiFetch<Product[]>(`/products${qs ? `?${qs}` : ""}`);
}

export async function getProductDetail(id: number) {
    return apiFetch<Product>(`/products/${id}`);
}

export async function getMyProducts(): Promise<Product[]> {
    return apiFetch<Product[]>("/products/me/all");
}

export async function createProduct(formData: FormData): Promise<Product> {
    return apiFetch<Product>("/products", { method: "POST", body: formData });
}

export async function updateProduct(id: number, formData: FormData): Promise<Product> {
    return apiFetch<Product>(`/products/${id}`, { method: "PATCH", body: formData });
}

export async function deactivateProduct(id: number): Promise<Product> {
    return apiFetch<Product>(`/products/${id}/deactivate`, { method: "PATCH" });
}

export async function reactivateProduct(id: number): Promise<Product> {
    return apiFetch<Product>(`/products/${id}/reactivate`, { method: "PATCH" });
}