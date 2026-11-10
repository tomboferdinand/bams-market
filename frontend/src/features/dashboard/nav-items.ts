import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  User,
  Users,
  UserCheck,
  Truck,
  History,
  Tag,
  CreditCard,
  Banknote,
} from "lucide-react";
import type { NavItem } from "@/components/layout/dashboard-shell";

// Le lien « Statistiques » a été retiré : la page n'existe pas encore (à construire après la soutenance).
export const COMMERCANT_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/commercant/dashboard" },
  { icon: Store, label: "Ma boutique", href: "/commercant/boutique" },
  { icon: Package, label: "Produits", href: "/commercant/produits" },
  { icon: ShoppingCart, label: "Commandes", href: "/commercant/commandes" },
  { icon: User, label: "Mon Profil", href: "/commercant/profil" },
];

export const LIVREUR_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/livreur/dashboard" },
  { icon: Truck, label: "Missions disponibles", href: "/livreur/missions" },
  { icon: Package, label: "Mes livraisons", href: "/livreur/livraisons" },
  { icon: History, label: "Historique", href: "/livreur/historique" },
  { icon: User, label: "Profil", href: "/livreur/profil" },
];

export const ADMIN_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/admin/dashboard" },
  { icon: Store, label: "Boutiques", href: "/admin/boutiques" },
  { icon: Users, label: "Utilisateurs", href: "/admin/utilisateurs" },
  { icon: UserCheck, label: "Demandes de rôle", href: "/admin/demandes" },
  { icon: Tag, label: "Catégories", href: "/admin/categories" },
  { icon: ShoppingCart, label: "Commandes", href: "/admin/commandes" },
  { icon: CreditCard, label: "Paiements", href: "/admin/paiements" },
  { icon: Banknote, label: "Retraits", href: "/admin/retraits" },
  { icon: History, label: "Journal d'activité", href: "/admin/journal" },
  { icon: User, label: "Mon Profil", href: "/admin/profil" },
];
