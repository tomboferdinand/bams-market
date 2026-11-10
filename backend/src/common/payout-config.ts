// Réglages des retraits (portefeuille → Mobile Money). Valeurs lues à l'appel, donc configurables
// par variables d'environnement et testables.
//
// PAYOUT_MODE=simulation (défaut) : retraits fictifs, pour les tests, la démonstration et le développement.
// PAYOUT_MODE=goalpay            : vrais retraits via l'API de retrait GoalPay (liste blanche).

export type PayoutMode = 'simulation' | 'goalpay';

const num = (value: string | undefined, fallback: number) => {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const getPayoutMode = (): PayoutMode =>
  (process.env.PAYOUT_MODE ?? 'simulation').trim().toLowerCase() === 'goalpay' ? 'goalpay' : 'simulation';

// Délai entre la livraison confirmée et la possibilité de retirer l'argent. Par défaut 0 : l'argent est
// retirable dès que la livraison est confirmée (code du client saisi). On peut imposer un délai
// (ex. 24) avec WALLET_HOLD_HOURS pour garder une marge en cas de litige.
export const getWalletHoldHours = () => num(process.env.WALLET_HOLD_HOURS, 0);
// Montants de retrait (Ar) : minimum pour limiter le poids des frais, maximum par retrait.
export const getMinPayoutAmount = () => num(process.env.PAYOUT_MIN_AMOUNT, 1000);
export const getMaxPayoutAmount = () => num(process.env.PAYOUT_MAX_AMOUNT, 500000);
// Plafonds glissants sur 24 h : montant total retiré et nombre de retraits (hors retraits échoués).
export const getDailyMaxPayoutAmount = () => num(process.env.PAYOUT_DAILY_MAX_AMOUNT, 1000000);
export const getDailyMaxPayoutCount = () => num(process.env.PAYOUT_DAILY_MAX_COUNT, 5) || 5;
// Confirmation par mot de passe : nombre d'erreurs tolérées, puis blocage temporaire.
export const getPayoutAuthMaxAttempts = () => num(process.env.PAYOUT_AUTH_MAX_ATTEMPTS, 5) || 5;
export const getPayoutAuthLockMinutes = () => num(process.env.PAYOUT_AUTH_LOCK_MINUTES, 15);
// Simulation : frais fictifs en pourcentage du montant retiré.
export const getSimulatedFeePercent = () => num(process.env.PAYOUT_SIM_FEE_PERCENT, 2);
