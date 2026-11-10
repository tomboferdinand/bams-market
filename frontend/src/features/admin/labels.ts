import type { ShopStatus } from "@/types/shop";
import type { Role, AccountStatus } from "@/types/auth";
import type { OrderStatus } from "@/types/order";
import type { PaymentStatus } from "@/types/payment";
import type { DeliveryStatus } from "@/types/delivery";

export const ROLE_LABEL: Record<Role, string> = {
  CLIENT: "Client", COMMERCANT: "Commerçant", LIVREUR: "Livreur", ADMINISTRATEUR: "Administrateur",
};
export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIF: "Actif", SUSPENDU: "Suspendu", DESACTIVE: "Désactivé",
};
export const SHOP_STATUS_LABEL: Record<ShopStatus, string> = {
  EN_ATTENTE_VALIDATION: "En attente", VALIDEE: "Validée", SUSPENDUE: "Suspendue", INACTIVE: "Inactive",
};
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  EN_ATTENTE_PAIEMENT: "En attente de paiement", PAYEE: "Payée", EN_PREPARATION: "En préparation",
  EN_COURS_DE_LIVRAISON: "En cours de livraison", LIVREE: "Livrée", ANNULEE: "Annulée", ECHOUEE: "Échouée",
};
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  EN_ATTENTE: "En attente", VALIDEE: "Confirmé", ECHOUEE: "Échoué", EXPIREE: "Expiré",
};
export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  DISPONIBLE: "Mission disponible", EN_COURS: "En cours", LIVREE: "Livrée", ECHEC: "Échec de remise",
};

// Valeurs brutes du journal d'audit (shop / user / order / payment confondus)
const VALUE_LABEL: Record<string, string> = {
  EN_ATTENTE_VALIDATION: "En attente de validation", VALIDEE: "Validée", SUSPENDUE: "Suspendue", INACTIVE: "Inactive",
  ACTIF: "Actif", SUSPENDU: "Suspendu", DESACTIVE: "Désactivé",
  EN_ATTENTE_PAIEMENT: "En attente de paiement", PAYEE: "Payée", EN_PREPARATION: "En préparation",
  EN_COURS_DE_LIVRAISON: "En cours de livraison", LIVREE: "Livrée", ANNULEE: "Annulée", ECHOUEE: "Échouée",
  EN_ATTENTE: "En attente", EXPIREE: "Expirée",
};
export const labelForValue = (v?: string | null) => (v ? VALUE_LABEL[v] ?? v : "—");