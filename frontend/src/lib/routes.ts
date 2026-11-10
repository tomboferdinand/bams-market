import type { Role } from "@/types/auth";

export const ROLE_HOME: Record<Role, string> = {
    CLIENT: "/",
    COMMERCANT: "/commercant/dashboard",
    LIVREUR: "/livreur/dashboard",
    ADMINISTRATEUR: "/admin/dashboard",
};