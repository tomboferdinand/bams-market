"use client";

import { useEffect, useState } from "react";
import { PackageX, CheckCircle2, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LIVREUR_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { getDeliveryHistory } from "@/services/deliveries.service";
import type { Delivery } from "@/types/delivery";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function DeliveryHistoryPage() {
  const { loading: authLoading } = useRequireRole(["LIVREUR"]);
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDeliveryHistory().then(setDeliveries).catch(() => setError(true));
  }, []);

  if (authLoading) return null;

  return (
    <DashboardShell title="Historique" portalLabel="Espace Livreur" navItems={LIVREUR_NAV} activeHref="/livreur/historique">
      <h2 className="text-2xl font-bold text-on-background">Historique des livraisons</h2>
      <p className="mt-1 text-on-surface-variant">Consultez vos livraisons passées.</p>

      {error && <ErrorState label="Impossible de charger l'historique." />}
      {!error && deliveries === null && <LoadingState label="Chargement..." />}

      {deliveries && deliveries.length === 0 && (
        <div className="mt-6 flex flex-col items-center rounded-xl border-2 border-dashed border-outline-variant py-16 text-center">
          <PackageX size={48} className="mb-4 text-outline" />
          <h3 className="mb-2 text-lg font-bold text-on-background">Aucune livraison dans l&apos;historique</h3>
          <p className="text-on-surface-variant">Vous n&apos;avez encore aucune livraison terminée.</p>
        </div>
      )}

      {deliveries && deliveries.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="px-6 py-3 text-xs font-semibold text-on-surface-variant">Commande</th>
                <th className="px-6 py-3 text-xs font-semibold text-on-surface-variant">Client</th>
                <th className="px-6 py-3 text-xs font-semibold text-on-surface-variant">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-on-surface-variant">Montant</th>
                <th className="px-6 py-3 text-xs font-semibold text-on-surface-variant">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td className="px-6 py-4 font-semibold text-on-surface">#CMD-{d.order.id}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{d.order.user.firstName} {d.order.user.lastName}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {d.deliveredAt && new Date(d.deliveredAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-on-surface">{fmt(d.order.total)} MGA</td>
                  <td className="px-6 py-4">
                    {d.status === "LIVREE" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container/20 px-2.5 py-1 text-xs font-semibold text-primary">
                        <CheckCircle2 size={14} /> Livrée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-error-container px-2.5 py-1 text-xs font-semibold text-on-error-container">
                        <XCircle size={14} /> Échec
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}