"use client";

import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string) => Promise<void>;
}

export function ConfirmCodeModal({ open, onClose, onConfirm }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (code.length !== 6) {
      setError("Le code doit contenir 6 chiffres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(code);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-surface-container-lowest p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-bold text-on-background">Confirmer la livraison</h3>
        <p className="mb-4 text-sm text-on-surface-variant">Demandez le code de confirmation à 6 chiffres au client.</p>
        {error && <p className="mb-3 text-sm text-error">{error}</p>}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          className="mb-4 w-full rounded-lg border border-outline-variant p-3 text-center text-xl tracking-widest outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high">Annuler</button>
          <button disabled={loading} onClick={handleSubmit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60">
            {loading ? "Vérification..." : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}