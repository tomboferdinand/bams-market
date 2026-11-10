export type ShopStatus = "EN_ATTENTE_VALIDATION" | "VALIDEE" | "SUSPENDUE" | "INACTIVE";

export interface Shop {
    id: number;
    ownerId: number;
    name: string;
    description: string;
    address: string;
    contactPhone: string;
    logoUrl: string | null;
    status: ShopStatus;
    createdAt: string;
    updatedAt: string;
}