/** Lien e-mail vers l'administration, avec le numéro de commande déjà dans l'objet. */
export function supportMailto(to: string, orderId?: number) {
  const subject = orderId ? `Problème de paiement - commande #${orderId}` : "Problème de paiement";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}`;
}
