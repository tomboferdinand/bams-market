/** « jean.dupont@gmail.com » → « je••••••@gmail.com » : reconnaissable sans exposer l'adresse entière. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  const hidden = Math.max(1, Math.min(local.length - visible.length, 6));
  return `${visible}${"•".repeat(hidden)}@${domain}`;
}
