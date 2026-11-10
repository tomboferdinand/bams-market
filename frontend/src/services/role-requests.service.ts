import { apiFetch } from "./api";
import type { RequestedRole, RoleRequest } from "@/types/role-request";

export const getMyRoleRequests = () => apiFetch<RoleRequest[]>("/role-requests/mine");

export const createRoleRequest = (input: { requestedRole: RequestedRole; payoutPhone: string; message?: string }) =>
  apiFetch<RoleRequest>("/role-requests", { method: "POST", body: JSON.stringify(input) });

export const cancelRoleRequest = (id: number) =>
  apiFetch<{ success: boolean }>(`/role-requests/${id}/cancel`, { method: "PATCH" });

export const activateRole = (token: string) =>
  apiFetch<{ success: boolean; role: RequestedRole }>("/role-requests/activate", { method: "POST", body: JSON.stringify({ token }) });

export const resendRoleActivation = (id: number) =>
  apiFetch<{ success: boolean }>(`/role-requests/${id}/resend-activation`, { method: "POST" });
