import type { Role } from "@/types/auth";
import type { PayoutStatus } from "@/types/wallet";

export interface AdminPayout {
  id: number;
  amount: number;
  fees: number;
  totalDebited: number;
  phone: string;
  status: PayoutStatus;
  error: string | null;
  reference: string;
  providerReference: string | null;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; role: Role };
}
