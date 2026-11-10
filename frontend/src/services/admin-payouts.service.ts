import { apiFetch } from "./api";
import type { AdminPayout } from "@/types/admin-payout";

export const getAdminPayouts = () => apiFetch<AdminPayout[]>("/admin/payouts");
