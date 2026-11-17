import type { AuditLogEntry } from "@/types/admin";
import type { Role } from "@/types/auth";
import { ROLE_LABEL, labelForValue } from "./labels";
import { formatPrice } from "@/lib/format";

/**
 * Traduction des entrées du journal d'audit en français lisible.
 * Uniquement pour l'affichage : les valeurs enregistrées en base (codes techniques) ne changent pas.
 */

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  SHOP_STATUS_CHANGE: "Statut boutique",
  USER_STATUS_CHANGE: "Statut compte",
  ORDER_STATUS_CHANGE: "Statut commande",
  PAYMENT_STATUS_CHANGE: "Statut paiement",
  ORDER_REFUND: "Remboursement",
  PASSWORD_RESET: "Mot de passe réinitialisé",
  ROLE_REQUESTED: "Demande de rôle",
  ROLE_REQUEST_CANCELLED: "Demande de rôle annulée",
  ROLE_REQUEST_APPROVED: "Demande de rôle approuvée",
  ROLE_REQUEST_REJECTED: "Demande de rôle refusée",
  ROLE_REQUEST_ACTIVATED: "Rôle activé",
  USER_ROLE_CHANGED: "Rôle modifié",
  PAYOUT_REQUESTED: "Retrait demandé",
  PAYOUT_STATUS_CHANGE: "Statut retrait",
  PAYOUT_PHONE_CHANGED: "Numéro de retrait modifié",
  PAYOUT_AUTH_LOCKED: "Retraits bloqués",
};

export const AUDIT_ENTITY_LABEL: Record<string, string> = {
  Shop: "Boutique",
  User: "Utilisateur",
  Order: "Commande",
  Payment: "Paiement",
  Payout: "Retrait",
  RoleRequest: "Demande de rôle",
};

/** "0328019162" → "032•••62" : on reconnaît le numéro sans l'afficher en entier. */
export function maskAuditPhone(phone: string): string {
  const p = phone.trim();
  return p.length <= 5 ? p : `${p.slice(0, 3)}•••${p.slice(-2)}`;
}

const roleLabel = (code: string) => ROLE_LABEL[code as Role] ?? code;
const PAYOUT_STATUS: Record<string, string> = { EN_ATTENTE: "En attente", REUSSI: "Réussi", ECHOUE: "Échoué" };
const REQUEST_STATUS: Record<string, string> = {
  EN_ATTENTE: "En attente", EN_COURS: "En cours", A_ACTIVER: "Lien d'activation envoyé",
  APPROUVEE: "Approuvée", REFUSEE: "Refusée", ANNULEE: "Annulée",
};

/** Valeur "STATUT:ROLE" (ex. "A_ACTIVER:LIVREUR") → "Lien d'activation envoyé (Livreur)". */
function requestValue(value: string | null): string {
  if (!value) return "—";
  const [status, role] = value.split(":");
  const label = REQUEST_STATUS[status] ?? labelForValue(status);
  return role ? `${label} (${roleLabel(role)})` : label;
}

/** Remplace un numéro malgache complet par sa version masquée dans un texte libre. */
function maskPhonesIn(text: string): string {
  return text.replace(/(?:\+?261|0)3[2348]\d{7}/g, (m) => maskAuditPhone(m));
}

/** Texte de la colonne « Détails ». */
export function describeAuditDetails(entry: Pick<AuditLogEntry, "action" | "previousValue" | "newValue">): string {
  const { action, previousValue: prev, newValue: next } = entry;
  switch (action) {
    case "USER_ROLE_CHANGED":
      return `Rôle modifié : ${roleLabel(prev ?? "?")} → ${roleLabel(next ?? "?")}`;
    case "ROLE_REQUESTED":
    case "ROLE_REQUEST_APPROVED":
    case "ROLE_REQUEST_ACTIVATED":
    case "ROLE_REQUEST_REJECTED":
    case "ROLE_REQUEST_CANCELLED":
      return `${requestValue(prev === "AUCUN" ? null : prev)} → ${requestValue(next)}`;
    case "PAYOUT_REQUESTED": {
      // Enregistré sous la forme "EN_ATTENTE:<total débité>:<numéro>"
      const [, total, phone] = (next ?? "").split(":");
      if (total && phone) return `Retrait demandé : ${formatPrice(Number(total))} MGA débités vers ${maskAuditPhone(phone)}`;
      return `Retrait demandé${next ? ` (${next})` : ""}`;
    }
    case "PAYOUT_STATUS_CHANGE":
      return `${PAYOUT_STATUS[prev ?? ""] ?? labelForValue(prev)} → ${PAYOUT_STATUS[next ?? ""] ?? labelForValue(next)}`;
    case "PAYOUT_PHONE_CHANGED":
      return `${prev && prev !== "AUCUN" ? maskAuditPhone(prev) : "Aucun numéro"} → ${maskPhonesIn(next ?? "—")}`;
    case "PAYOUT_AUTH_LOCKED": {
      const minutes = /BLOQUE_(\d+)_MIN/.exec(next ?? "")?.[1];
      return minutes ? `Trop d'erreurs de mot de passe : retraits bloqués ${minutes} min` : "Retraits bloqués";
    }
    case "PASSWORD_RESET":
      return "Mot de passe réinitialisé par l'utilisateur";
    case "ORDER_REFUND":
      return `Remboursé : ${next ?? "—"}`;
    default:
      return `${labelForValue(prev)} → ${labelForValue(next)}`;
  }
}

/** Valeur de l'entrée qui sert à colorer l'étiquette d'action (succès / échec / neutre). */
export function auditToneValue(entry: Pick<AuditLogEntry, "action" | "newValue">): string | null {
  const v = entry.newValue ?? "";
  if (entry.action === "PAYOUT_STATUS_CHANGE") return v === "REUSSI" ? "VALIDEE" : v === "ECHOUE" ? "ECHOUEE" : v;
  if (entry.action === "ROLE_REQUEST_ACTIVATED" || entry.action === "USER_ROLE_CHANGED") return "VALIDEE";
  if (entry.action === "ROLE_REQUEST_REJECTED") return "ECHOUEE";
  if (entry.action === "PAYOUT_AUTH_LOCKED") return "SUSPENDU";
  return v.split(":")[0] || null;
}
