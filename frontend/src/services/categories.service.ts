import { apiFetch } from "./api";
import type { Category } from "@/types/product";
import type { AdminCategory } from "@/types/category-admin";


export async function getActiveCategories() {
    return apiFetch<Category[]>("/categories");
}



export async function getAdminCategories(): Promise<AdminCategory[]> {
    return apiFetch<AdminCategory[]>("/categories/admin");
}

export async function createCategory(name: string) {
    return apiFetch<AdminCategory>("/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
    });
}

export async function updateCategory(id: number, name: string) {
    return apiFetch<AdminCategory>(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
    });
}

export async function deactivateCategory(id: number) {
    return apiFetch<AdminCategory>(`/categories/${id}/deactivate`, { method: "PATCH" });
}

export async function reactivateCategory(id: number) {
    return apiFetch<AdminCategory>(`/categories/${id}/reactivate`, { method: "PATCH" });
}