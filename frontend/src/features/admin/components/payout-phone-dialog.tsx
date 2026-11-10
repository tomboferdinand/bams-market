"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Phone } from "lucide-react";
import { ApiError } from "@/services/api";
import { setUserPayoutPhone } from "@/services/admin.service";
import { payoutPhoneIssue } from "../payout-phone";
import type { AdminUser } from "@/types/admin";

const INPUT = "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary";

interface Props {
  user: AdminUser;
  onClose: () => void;
  onSaved: (userId: number, payoutPhone: string) => void;
}

/** Changement du numéro de retrait d'un commerçant ou d'un livreur : réservé à l'administration, motif obligatoire. */
export function PayoutPhoneDialog({ user, onClose, onSaved }: Props) {
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const issue = payoutPhoneIssue(phone, reason, user.payoutPhone);
    if (issue) return setError(issue);
    setBusy(true);
    setError(null);
    try {
      const res = await setUserPayoutPhone(user.id, phone, reason.trim());
      onSaved(user.id, res.payoutPhone);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="payout-phone-title"
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-lg"
      >
        <h2 id="payout-phone-title" className="flex items-center gap-2 text-lg font-bold text-on-surface">
          <Phone size={18} /> Changer le numéro de retrait
        </h2>
        <p className="text-sm text-on-surface-variant">
          {user.firstName} {user.lastName} · numéro actuel : <strong>{user.payoutPhone ?? "aucun"}</strong>
        </p>

        <div className="space-y-1">
          <label htmlFor="new-payout-phone" className="text-sm font-semibold text-on-surface">Nouveau numéro de retrait</label>
          <input id="new-payout-phone" className={INPUT} inputMode="tel" placeholder="Ex : 034 12 345 67"
            value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
        </div>
        <div className="space-y-1">
          <label htmlFor="payout-phone-reason" className="text-sm font-semibold text-on-surface">Motif du changement</label>
          <textarea id="payout-phone-reason" className={INPUT} rows={3} maxLength={300}
            placeholder="Ex : numéro perdu, vérifié par téléphone avec le titulaire"
            value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <p className="text-xs text-on-surface-variant">
          Le changement est enregistré dans le journal d&apos;activité et le titulaire est prévenu par e-mail.
        </p>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface disabled:opacity-50">
            Annuler
          </button>
          <button disabled={busy}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">
            Enregistrer le numéro
          </button>
        </div>
      </form>
    </div>
  );
}
