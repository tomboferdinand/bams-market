export type PaymentStatus = "EN_ATTENTE" | "VALIDEE" | "ECHOUEE" | "EXPIREE";

export interface Payment {
  id: number;
  orderId: number;
  provider: string;
  externalReference: string | null;
  amount: number;
  commissionAmount: number;
  merchantAmount: number;
  status: PaymentStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPayment extends Payment {
  order: { id: number; userId: number };
}