/**
 * Mode de paiement de l'application (variable d'environnement PAYMENT_MODE).
 *
 *  - "simulation" (par défaut) : paiement simulé, utilisé pour les tests, la démonstration
 *    et la soutenance. L'endpoint de simulation du résultat est actif.
 *  - "goalpay" : paiement réel via GoalPay. L'endpoint de simulation est INTERDIT :
 *    sinon un client pourrait valider lui-même son paiement sans payer.
 *
 * Avant tout lancement réel : PAYMENT_MODE=goalpay dans le .env de production.
 */
export type PaymentMode = 'simulation' | 'goalpay';

export function getPaymentMode(): PaymentMode {
  return process.env.PAYMENT_MODE === 'goalpay' ? 'goalpay' : 'simulation';
}

export function isPaymentSimulation(): boolean {
  return getPaymentMode() === 'simulation';
}
