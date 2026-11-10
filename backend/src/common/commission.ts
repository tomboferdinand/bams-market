// Commission de la plateforme (BR-PAY-04).
//
// Elle est calculée sur le SOUS-TOTAL des articles (jamais sur les frais de livraison, qui
// reviennent au livreur) puis figée sur la commande au moment de sa création : un changement
// ultérieur de COMMISSION_PERCENT n'affecte donc pas les commandes déjà passées.
//
// Répartition d'une commande :
//   total payé par le client = sous-total + frais de livraison
//   commerçant               = sous-total − commission
//   livreur                  = frais de livraison
//   plateforme               = commission
//
// La valeur est lue à l'appel (et non à l'import) pour rester configurable et testable.

export const DEFAULT_COMMISSION_PERCENT = 10;

export function getCommissionPercent(): number {
  const raw = process.env.COMMISSION_PERCENT;
  if (raw === undefined || raw.trim() === '') return DEFAULT_COMMISSION_PERCENT;
  const value = Number(raw);
  // Valeur absurde (texte, négatif, > 100) : on retombe sur la valeur par défaut plutôt que de
  // calculer des montants faux.
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : DEFAULT_COMMISSION_PERCENT;
}

export interface OrderCommission {
  commissionPercent: number;
  commissionAmount: number;
  merchantAmount: number;
}

export function computeCommission(subtotal: number): OrderCommission {
  const commissionPercent = getCommissionPercent();
  const commissionAmount = Math.round((subtotal * commissionPercent) / 100);
  return { commissionPercent, commissionAmount, merchantAmount: subtotal - commissionAmount };
}
