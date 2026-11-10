import type { AdminPayout } from "@/types/admin-payout";
import type { PayoutStatus } from "@/types/wallet";

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  EN_ATTENTE: "En attente",
  REUSSI: "Réussi",
  ECHOUE: "Échoué (remboursé)",
};

export const PAYOUT_STATUS_CLASS: Record<PayoutStatus, string> = {
  EN_ATTENTE: "bg-secondary-container/20 text-secondary border border-secondary/20",
  REUSSI: "bg-primary-container/10 text-primary-container border border-primary-container/20",
  ECHOUE: "bg-error-container text-on-error-container border border-error/20",
};

export interface PayoutStats {
  paidAmount: number; // montants réellement versés (retraits réussis)
  paidFees: number; // frais de retrait des retraits réussis
  paidCount: number;
  pendingCount: number;
  pendingAmount: number; // total débité des retraits en attente
  failedCount: number;
}

export function computePayoutStats(payouts: AdminPayout[]): PayoutStats {
  const s: PayoutStats = { paidAmount: 0, paidFees: 0, paidCount: 0, pendingCount: 0, pendingAmount: 0, failedCount: 0 };
  for (const p of payouts) {
    if (p.status === "REUSSI") {
      s.paidAmount += p.amount;
      s.paidFees += p.fees;
      s.paidCount += 1;
    } else if (p.status === "EN_ATTENTE") {
      s.pendingCount += 1;
      s.pendingAmount += p.totalDebited;
    } else {
      s.failedCount += 1;
    }
  }
  return s;
}

/** Filtre par statut (vide = tous) et recherche sur nom, numéro, référence. */
export function filterPayouts(payouts: AdminPayout[], status: string, search: string): AdminPayout[] {
  const q = search.trim().toLowerCase();
  return payouts.filter((p) => {
    if (status && p.status !== status) return false;
    if (!q) return true;
    const hay = `${p.user.firstName} ${p.user.lastName} ${p.phone} ${p.reference} ${p.providerReference ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}
