import type { Shop } from "./shop";
import type { Role, AccountStatus, VerificationStatus } from "./auth";
import type { OrderStatus, OrderStatusEntry } from "./order";
import type { Payment } from "./payment";
import type { DeliveryStatus } from "./delivery";

export interface AdminShop extends Shop {
  owner: { firstName: string; lastName: string; email: string | null; phone: string | null };
}

export interface PendingShopSummary extends Omit<Shop, never> {
  owner: { firstName: string; lastName: string };
}

export interface AdminUser {
  id: number;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: Role;
  accountStatus: AccountStatus;
  verificationStatus: VerificationStatus;
  /** Numéro de retrait (commerçants et livreurs) ; modifiable uniquement par l'administration. */
  payoutPhone: string | null;
  createdAt: string;
}

/** Remboursement manuel d'une commande dont la livraison a échoué après paiement. */
export interface AdminRefund {
  id: number;
  amount: number;
  reference: string;
  note: string | null;
  createdAt: string;
}

export interface AdminOrderListItem {
  id: number;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; phone: string | null };
  items: {
    id: number;
    quantity: number;
    unitPrice: number;
    product: { name: string; imageUrl: string | null; shop: { id: number; name: string } };
  }[];
  payment: Payment | null;
  delivery: {
    id: number;
    status: DeliveryStatus;
    acceptedAt: string | null;
    deliveredAt: string | null;
    livreur: { firstName: string; lastName: string } | null;
  } | null;
  refund: AdminRefund | null;
}

export interface AdminOrderDetail extends AdminOrderListItem {
  user: AdminOrderListItem["user"] & { email: string | null };
  address: { label: string; fullAddress: string; city: string; phone: string };
  statusHistory: OrderStatusEntry[];
  refund: (AdminRefund & { admin: { firstName: string; lastName: string } }) | null;
}

export interface AdminDashboard {
  users: number;
  validatedShops: number;
  pendingShops: number;
  ordersToday: number;
  paymentsVolume: number;
  recentPendingShops: PendingShopSummary[];
}

export interface AuditLogEntry {
  id: number;
  actorId: number | null;
  action: string;
  entityType: string;
  entityId: number;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string; role: Role } | null;
}
