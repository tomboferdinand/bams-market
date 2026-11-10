import { apiFetch } from "./api";
import type { Payment, AdminPayment } from "@/types/payment";

// checkoutUrl : page de paiement GoalPay (mode réel). Absente en mode simulation.
export type CheckoutPayment = Payment & { checkoutUrl?: string | null };
export type LatestPayment = Payment & { orderId: number };

export const initiatePayment = (orderId: number) =>
  apiFetch<CheckoutPayment>("/payments", { method: "POST", body: JSON.stringify({ orderId }) });

export const getPaymentStatus = (orderId: number) =>
  apiFetch<Payment>(`/payments/order/${orderId}`);

// Dernier paiement du client connecté : utilisé par la page de retour de GoalPay.
export const getLatestPayment = () => apiFetch<LatestPayment>("/payments/latest");

export const simulatePaymentCallback = (paymentId: number, outcome: "SUCCESS" | "FAILURE") =>
  apiFetch<Payment>(`/payments/${paymentId}/simulate`, { method: "POST", body: JSON.stringify({ outcome }) });

export const getAdminPayments = () => apiFetch<AdminPayment[]>("/payments");
