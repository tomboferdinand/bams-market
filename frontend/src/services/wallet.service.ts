import { apiFetch } from "./api";
import type { Wallet, PayoutSettings, Payout, PayoutPreview } from "@/types/wallet";

const json = (body: unknown) => JSON.stringify(body);

export const getWallet = () => apiFetch<Wallet>("/wallet/me");
export const getPayoutSettings = () => apiFetch<PayoutSettings>("/payouts/settings");
export const getMyPayouts = () => apiFetch<Payout[]>("/payouts");
/** Étape 1 : montants du retrait (rien n'est exécuté). */
export const previewPayout = (amount: number) =>
  apiFetch<PayoutPreview>("/payouts/preview", { method: "POST", body: json({ amount }) });
/** Étape 2 : exécution, confirmée par le mot de passe du titulaire. */
export const createPayout = (amount: number, password: string) =>
  apiFetch<Payout>("/payouts", { method: "POST", body: json({ amount, password }) });
