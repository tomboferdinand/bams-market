export type RequestedRole = "COMMERCANT" | "LIVREUR";
export type RoleRequestStatus = "EN_ATTENTE" | "A_ACTIVER" | "APPROUVEE" | "REFUSEE" | "ANNULEE";

export interface RoleRequest {
  id: number;
  requestedRole: RequestedRole;
  payoutPhone: string;
  message: string | null;
  status: RoleRequestStatus;
  rejectionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface AdminRoleRequest extends RoleRequest {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    verificationStatus: "VERIFIE" | "NON_VERIFIE";
  };
}

/** Réponse de l'approbation : emailSent=false si le lien d'activation n'a pas pu partir. */
export type ApprovedRoleRequest = AdminRoleRequest & { emailSent: boolean };
