import type { RequestedRole, RoleRequestStatus } from "@/types/role-request";

export const REQUESTED_ROLE_LABEL: Record<RequestedRole, string> = {
  COMMERCANT: "Commerçant",
  LIVREUR: "Livreur",
};

export const ROLE_REQUEST_STATUS_LABEL: Record<RoleRequestStatus, string> = {
  EN_ATTENTE: "En attente",
  A_ACTIVER: "Approuvée, à activer",
  APPROUVEE: "Approuvée",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
};

export const ROLE_REQUEST_STATUS_CLASS: Record<RoleRequestStatus, string> = {
  EN_ATTENTE: "bg-secondary-container text-on-secondary-container",
  A_ACTIVER: "bg-tertiary-container text-on-tertiary-container",
  APPROUVEE: "bg-primary-container text-on-primary-container",
  REFUSEE: "bg-error-container text-on-error-container",
  ANNULEE: "bg-surface-container text-on-surface-variant",
};
