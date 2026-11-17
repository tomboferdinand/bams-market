/** Lien e-mail vers l'administration, avec le numéro de commande déjà dans l'objet. */
export function supportMailto(to: string, orderId?: number) {
  const subject = orderId ? `Problème de paiement - commande #${orderId}` : "Problème de paiement";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}`;
}

/** Demande de remboursement après une livraison échouée : le numéro de commande suffit (montant connu du système). */
export function refundMailto(to: string, orderId: number) {
  return `mailto:${to}?subject=${encodeURIComponent(`Remboursement commande #${orderId}`)}`;
}
