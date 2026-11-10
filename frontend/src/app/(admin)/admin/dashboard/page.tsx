"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Store, Clock, ShoppingCart, Wallet, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { getAdminDashboard } from "@/services/admin.service";
import { formatPrice, formatDate } from "@/lib/format";
import type { AdminDashboard } from "@/types/admin";

export default function AdminDashboardPage() {
  const { loading: authLoading } = useRequireRole(["ADMINISTRATEUR"]);
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAdminDashboard().then(setData).catch(() => setError(true));
  }, []);

  if (authLoading) return null;

  const cards = data
    ? [
        { label: "Utilisateurs", value: formatPrice(data.users), icon: Users },
        { label: "Boutiques validées", value: formatPrice(data.validatedShops), icon: Store },
        { label: "Boutiques en attente", value: formatPrice(data.pendingShops), icon: Clock, alert: data.pendingShops > 0 },
        { label: "Commandes aujourd'hui", value: formatPrice(data.ordersToday), icon: ShoppingCart },
        { label: "Volume des paiements confirmés", value: `${formatPrice(data.paymentsVolume)} MGA`, icon: Wallet, wide: true },
      ]
    : [];

  return (
    <DashboardShell title="Vue d'ensemble" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/dashboard">
      <h2 className="text-2xl font-bold text-on-surface">Vue d&apos;ensemble</h2>
      <p className="mt-1 text-on-surface-variant">Indicateurs de la plateforme</p>

      {error && <ErrorState label="Impossible de charger les indicateurs." />}
      {!error && !data && <LoadingState label="Chargement..." />}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.label}
                className={`rounded-xl border p-6 shadow-sm ${c.wide ? "lg:col-span-2" : ""} ${
                  c.alert ? "border-error bg-error-container/20" : "border-outline-variant bg-surface"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-3 ${c.alert ? "bg-surface-container-lowest text-error" : "bg-surface-container text-primary"}`}>
                    <c.icon size={20} />
                  </div>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${c.alert ? "text-on-error-container" : "text-on-surface-variant"}`}>
                    {c.label}
                  </p>
                </div>
                <h3 className={`mt-4 text-3xl font-bold ${c.alert ? "text-on-error-container" : "text-on-surface"}`}>{c.value}</h3>
              </div>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-6">
              <h3 className="text-lg font-bold text-on-surface">Demandes récentes de boutiques</h3>
              <Link href="/admin/boutiques" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Voir tout <ArrowRight size={16} />
              </Link>
            </div>
            {data.recentPendingShops.length === 0 ? (
              <div className="p-6"><EmptyState label="Aucune demande en attente." /></div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant">
                    <th className="px-6 py-3 font-semibold">Boutique</th>
                    <th className="px-6 py-3 font-semibold">Propriétaire</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {data.recentPendingShops.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-container">
                      <td className="px-6 py-4 font-medium text-on-surface">{s.name}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{s.owner.firstName} {s.owner.lastName}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{formatDate(s.createdAt)}</td>
                      <td className="px-6 py-4">
                        <Link href="/admin/boutiques" className="rounded bg-primary px-3 py-1 text-xs font-semibold text-on-primary hover:bg-tertiary">
                          Examiner
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}