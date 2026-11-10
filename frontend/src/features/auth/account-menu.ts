import type { Role } from "@/types/auth";

export interface AccountLink {
  href: string;
  label: string;
}

/**
 * Entrée du menu de l'avatar vers l'espace personnel, selon le rôle.
 * La vitrine reste accessible à tous (aucune redirection automatique) : ce lien est le moyen d'aller dans son espace.
 */
export const ACCOUNT_LINK: Record<Role, AccountLink> = {
  CLIENT: { href: "/profil", label: "Mon compte" },
  COMMERCANT: { href: "/commercant/dashboard", label: "Mon espace commerçant" },
  LIVREUR: { href: "/livreur/dashboard", label: "Mon espace livreur" },
  ADMINISTRATEUR: { href: "/admin/dashboard", label: "Administration" },
};

export const accountLinkFor = (role: Role): AccountLink => ACCOUNT_LINK[role];
