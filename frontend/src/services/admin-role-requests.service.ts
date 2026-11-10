import { apiFetch } from "./api";
import type { AdminRoleRequest, ApprovedRoleRequest } from "@/types/role-request";

export const getAdminRoleRequests = (status?: string) =>
  apiFetch<AdminRoleRequest[]>(`/admin/role-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`);

export const approveRoleRequest = (id: number) =>
  apiFetch<ApprovedRoleRequest>(`/admin/role-requests/${id}/approve`, { method: "PATCH" });

export const rejectRoleRequest = (id: number, reason: string) =>
  apiFetch<AdminRoleRequest>(`/admin/role-requests/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) });

export const resendActivationAsAdmin = (id: number) =>
  apiFetch<{ success: boolean }>(`/admin/role-requests/${id}/resend-activation`, { method: "PATCH" });
