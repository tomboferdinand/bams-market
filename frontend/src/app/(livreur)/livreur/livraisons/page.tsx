"use client";

import { useEffect, useState } from "react";
import { Phone, Check, AlertTriangle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LIVREUR_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MissionCard } from "@/features/deliveries/components/mission-card";
import { ConfirmCodeModal } from "@/features/deliveries/components/confirm-code-modal";
import { getMyDeliveries, confirmDelivery, reportDeliveryFailure } from "@/services/deliveries.service";
import { ApiError } from "@/services/api";
import type { Delivery } from "@/types/delivery";

export default function MyDeliveriesPage() {
  const { loading: authLoading } = useRequireRole(["LIVREUR"]);
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [error, setError] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Delivery | null>(null);
  const [failTarget, setFailTarget] = useState<Delivery | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function load() {
    getMyDeliveries().then(setDeliveries).catch(() => setError(true));
  }
  useEffect(load, []);

  async function handleConfirmCode(code: string) {
    if (!confirmTarget) return;
    try {
      await confirmDelivery(confirmTarget.id, code);
      setDeliveries((prev) => prev!.filter((d) => d.id !== confirmTarget.id));
      setConfirmTarget(null);
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : "Code incorrect.");
    }
  }

  async function handleFail() {
    if (!failTarget) return;
    setActionError(null);
    try {
      await reportDeliveryFailure(failTarget.id);
      setDeliveries((prev) => prev!.filter((d) => d.id !== failTarget.id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.");
    } finally {
      setFailTarget(null);
    }
  }

  if (authLoading) return null;

  return (
    <DashboardShell title="Mes livraisons" portalLabel="Espace Livreur" navItems={LIVREUR_NAV} activeHref="/livreur/livraisons">
      <h2 className="text-2xl font-bold text-on-background">Mes livraisons</h2>
      <p className="mt-1 text-on-surface-variant">Livraisons en cours que vous avez acceptées.</p>

      {actionError && <p role="alert" className="mt-4 rounded-lg bg-error-container/30 p-3 text-sm text-on-error-container">{actionError}</p>}

      {error && <ErrorState label="Impossible de charger vos livraisons." />}
      {!error && deliveries === null && <LoadingState label="Chargement..." />}
      {!error && deliveries !== null && deliveries.length === 0 && <EmptyState label="Aucune livraison en cours." />}

      {deliveries && deliveries.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-gutter lg:grid-cols-2 xl:grid-cols-3">
          {deliveries.map((d) => (
            <div key={d.id} className="flex flex-col gap-3">
              <MissionCard delivery={d} />
              <div className="flex flex-wrap gap-2">
                {d.order.user.phone && (
                <a
                  href={`tel:${d.order.user.phone}`}
                  className="flex h-11 items-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
                >
                  <Phone size={16} /> Appeler
                </a>
                )}
                <button
                  onClick={() => setConfirmTarget(d)}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-container"
                >
                  <Check size={16} /> Confirmer la livraison
                </button>
                <button
                  aria-label="Signaler un échec de livraison"
                  onClick={() => setFailTarget(d)}
                  className="flex h-11 items-center gap-2 rounded-lg border border-error px-4 text-sm font-semibold text-error hover:bg-error-container/10"
                >
                  <AlertTriangle size={16} /> <span className="hidden sm:inline">Livraison impossible</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmCodeModal open={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={handleConfirmCode} />

      <ConfirmDialog
        open={!!failTarget}
        title="Signaler un échec de livraison ?"
        description="Le client était injoignable ou absent. La mission sera close et la commande marquée « Échouée » : vous ne serez pas payé pour cette livraison. Cette action est irréversible."
        confirmLabel="Signaler l'échec"
        onConfirm={handleFail}
        onCancel={() => setFailTarget(null)}
      />
    </DashboardShell>
  );
}