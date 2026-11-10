import { apiFetch } from "./api";
import type { AccountStatus } from "@/types/auth";
import type {
  AdminDashboard, AdminUser, AdminOrderListItem, AdminOrderDetail, AdminRefund, AuditLogEntry,
} from "@/types/admin";

export const getAdminDashboard = () => apiFetch<AdminDashboard>("/admin/dashboard");

export const getAdminUsers = () => apiFetch<AdminUser[]>("/admin/users");
export const updateUserStatus = (id: number, accountStatus: AccountStatus) =>
  apiFetch<AdminUser>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ accountStatus }) });
/** Seule voie pour changer le numéro de retrait d'un commerçant ou d'un livreur (motif obligatoire, audité). */
export const setUserPayoutPhone = (id: number, phone: string, reason: string) =>
  apiFetch<{ payoutPhone: string }>(`/admin/payouts/users/${id}/phone`, {
    method: "PATCH",
    body: JSON.stringify({ phone, reason }),
  });

export const getAdminOrders = () => apiFetch<AdminOrderListItem[]>("/admin/orders");
export const getAdminOrderDetail = (id: number) => apiFetch<AdminOrderDetail>(`/admin/orders/${id}`);
/** Enregistre le remboursement manuel d'une commande (livraison échouée après paiement). Une seule fois par commande. */
export const refundOrder = (id: number, reference: string, note?: string) =>
  apiFetch<AdminRefund>(`/admin/orders/${id}/refund`, {
    method: "POST",
    body: JSON.stringify({ reference, ...(note ? { note } : {}) }),
  });

export const getAuditLogs = (entityType?: string) =>
  apiFetch<AuditLogEntry[]>(`/admin/audit-logs${entityType ? `?entityType=${entityType}` : ""}`);
