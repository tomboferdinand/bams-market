export interface Category {
    id: number;
    name: string;
}

export interface ProductShop {
    id: number;
    name: string;
    logoUrl: string | null;
    address?: string;
}

export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    status: "DISPONIBLE" | "RUPTURE_DE_STOCK";
    imageUrl: string | null;
    isActive: boolean;
    categoryId: number;
    category: Category;
    shopId: number;
    shop: ProductShop;
    createdAt: string;
}