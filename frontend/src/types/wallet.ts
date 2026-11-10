export type WalletEntryType = "VENTE" | "LIVRAISON" | "RETRAIT" | "RETRAIT_ANNULE";

export interface WalletEntry {
  id: number;
  type: WalletEntryType;
  amount: number; // négatif pour un retrait
  orderId: number | null;
  payoutId: number | null;
  availableAt: string;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  available: number;
  entries: WalletEntry[];
}

export interface PayoutSettings {
  mode: "simulation" | "goalpay";
  /** Numéro de réception : enregistré à l'activation du rôle, modifiable uniquement par l'administration. */
  payoutPhone: string | null;
  /** Confirmation bloquée (trop d'erreurs de mot de passe) jusqu'à cette date. */
  authLockedUntil: string | null;
  minAmount: number;
  maxAmount: number;
  /** Plafond sur 24 h glissantes, ce qu'il en reste, et le nombre de retraits encore possibles. */
  dailyMaxAmount: number;
  dailyRemaining: number;
  dailyRemainingCount: number;
  holdHours: number;
}

export type PayoutStatus = "EN_ATTENTE" | "REUSSI" | "ECHOUE";

export interface Payout {
  id: number;
  amount: number;
  fees: number;
  totalDebited: number;
  phone: string;
  status: PayoutStatus;
  error: string | null;
  createdAt: string;
}

export interface PayoutPreview {
  amount: number;
  fees: number;
  totalDebited: number;
  phone: string;
  available: number;
}
