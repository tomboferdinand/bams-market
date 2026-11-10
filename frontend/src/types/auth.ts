export type Role = "CLIENT" | "COMMERCANT" | "LIVREUR" | "ADMINISTRATEUR";
export type AccountStatus = "ACTIF" | "SUSPENDU" | "DESACTIVE";
export type VerificationStatus = "VERIFIE" | "NON_VERIFIE";

export interface AuthUser {
    id: number;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string;
    role: Role;
    accountStatus: AccountStatus;
    verificationStatus: VerificationStatus;
    createdAt: string;
}