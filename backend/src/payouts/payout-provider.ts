// Fournisseur de retraits (Mobile Money). Deux implémentations : simulation (défaut) et GoalPay.
// Le service des retraits ne connaît que ce contrat.

export interface PayoutPreview {
  /** Frais (passerelle + opérateur) à la charge du bénéficiaire. */
  fees: number;
}

export interface PayoutResult {
  /** success : envoyé ; failed : refusé définitivement ; pending : en cours (webhook / suivi à venir). */
  status: 'success' | 'failed' | 'pending';
  providerReference?: string;
  error?: string;
}

export abstract class PayoutProvider {
  /** Autorise le numéro à recevoir des retraits (liste blanche). */
  abstract ensureWhitelisted(phone: string, ownerName: string, maxAmount: number): Promise<void>;
  /** Frais exacts pour un retrait, sans rien exécuter. */
  abstract preview(phone: string, amount: number): Promise<PayoutPreview>;
  /** Lance le retrait. `reference` est notre référence unique (idempotence côté fournisseur). */
  abstract withdraw(input: { phone: string; amount: number; reference: string }): Promise<PayoutResult>;
}
