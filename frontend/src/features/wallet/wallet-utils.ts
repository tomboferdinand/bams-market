import type { PayoutSettings, PayoutStatus, WalletEntryType } from "@/types/wallet";

/** Montant entier strictement positif, ou null. */
export function parseAmount(input: string): number | null {
  const clean = input.replace(/\s/g, "");
  if (!/^\d+$/.test(clean)) return null;
  const n = Number(clean);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Message d'erreur de saisie du montant, ou null si le montant est acceptable. */
export function amountIssue(
  amount: number | null,
  s: Pick<PayoutSettings, "minAmount" | "maxAmount" | "dailyRemaining">,
  available: number,
): string | null {
  if (amount === null) return "Saisissez un montant en chiffres.";
  if (amount < s.minAmount) return `Le montant minimum est de ${s.minAmount} Ar.`;
  if (amount > s.maxAmount) return `Le montant maximum par retrait est de ${s.maxAmount} Ar.`;
  if (amount > s.dailyRemaining) return `Plafond journalier : il vous reste ${s.dailyRemaining} Ar à retirer aujourd'hui.`;
  if (amount > available) return "Montant supérieur à votre solde disponible.";
  return null;
}

export const ENTRY_LABELS: Record<WalletEntryType, string> = {
  VENTE: "Vente (après commission)",
  LIVRAISON: "Livraison effectuée",
  RETRAIT: "Retrait",
  RETRAIT_ANNULE: "Retrait annulé (remboursé)",
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  EN_ATTENTE: "En attente",
  REUSSI: "Réussi",
  ECHOUE: "Échoué (remboursé)",
};

export const isFuture = (iso: string | null, now = Date.now()) => !!iso && new Date(iso).getTime() > now;

/**
 * Pourquoi le retrait n'est pas possible maintenant (message affiché à l'utilisateur), ou null s'il l'est.
 * `fmt` met une date ISO en forme lisible.
 */
export function withdrawBlocker(
  s: Pick<PayoutSettings, "payoutPhone" | "authLockedUntil" | "minAmount" | "dailyRemaining" | "dailyRemainingCount">,
  available: number,
  fmt: (iso: string) => string,
  now = Date.now(),
): string | null {
  if (!s.payoutPhone) return "Aucun numéro de retrait n'est enregistré sur votre compte. Contactez l'administration.";
  if (isFuture(s.authLockedUntil, now)) return `Trop d'erreurs de mot de passe : réessayez après ${fmt(s.authLockedUntil!)}.`;
  if (s.dailyRemainingCount <= 0) return "Vous avez atteint le nombre de retraits autorisés sur 24 h. Réessayez plus tard.";
  if (s.dailyRemaining < s.minAmount) return "Plafond journalier atteint : réessayez plus tard.";
  if (available < s.minAmount) return `Il faut au moins ${s.minAmount} Ar disponibles pour retirer (disponible : ${available} Ar).`;
  return null;
}
