"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { getAdminPayouts } from "@/services/admin-payouts.service";
import { ROLE_LABEL } from "@/features/admin/labels";
import {
  PAYOUT_STATUS_LABEL, PAYOUT_STATUS_CLASS, computePayoutStats, filterPayouts,
} from "@/features/admin/payouts-utils";
import { formatPrice, formatDateTime } from "@/lib/format";
import type { AdminPayout } from "@/types/admin-payout";

export default function AdminPayoutsPage() {
  const { loading: authLoading } = useRequireRole(["ADMINISTRATEUR"]);
  const [payouts, setPayouts] = useState<AdminPayout[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    getAdminPayouts().then(setPayouts).catch(() => setError(true));
  }, []);

  const stats = useMemo(() => computePayoutStats(payouts ?? []), [payouts]);
  const filtered = useMemo(() => filterPayouts(payouts ?? [], statusFilter, search), [payouts, statusFilter, search]);

  if (authLoading) return null;

  return (
    <DashboardShell title="Bam'S Market" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/retraits">
      <h1 className="text-2xl font-bold text-on-surface">Supervision des Retraits</h1>
      <p className="mt-2 text-on-surface-variant">
        Retraits des commerçants et livreurs (200 derniers). Un retrait se règle automatiquement ; il n&apos;est pas modifiable ici.
      </p>

      {error && <ErrorState label="Impossible de charger les retraits." />}
      {!error && payouts === null && <LoadingState label="Chargement..." />}

      {payouts && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-gutter md:grid-cols-3">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">Total versé</p>
              <p className="mt-2 text-3xl font-bold text-primary">{formatPrice(stats.paidAmount)} MGA</p>
              <p className="mt-1 text-sm text-on-surface-variant">
                {stats.paidCount} retrait{stats.paidCount > 1 ? "s" : ""} · frais {formatPrice(stats.paidFees)} MGA
              </p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">En attente</p>
              <p className="mt-2 text-3xl font-bold text-secondary">{stats.pendingCount}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{formatPrice(stats.pendingAmount)} MGA débités</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">Échoués (remboursés)</p>
              <p className="mt-2 text-3xl font-bold text-on-surface">{stats.failedCount}</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="flex flex-col items-center justify-between gap-4 border-b border-outline-variant bg-surface p-4 sm:flex-row">
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher nom, numéro, référence..."
                  aria-label="Rechercher un retrait"
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filtrer par statut"
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm sm:w-auto"
              >
                <option value="">Tous les statuts</option>
                <option value="REUSSI">Réussi</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="ECHOUE">Échoué</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState label="Aucun retrait ne correspond." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface">
                      <th className="p-4 text-sm font-semibold text-on-surface-variant">Date</th>
                      <th className="p-4 text-sm font-semibold text-on-surface-variant">Bénéficiaire</th>
                      <th className="p-4 text-sm font-semibold text-on-surface-variant">Numéro</th>
                      <th className="p-4 text-right text-sm font-semibold text-on-surface-variant">Montant</th>
                      <th className="p-4 text-right text-sm font-semibold text-on-surface-variant">Frais</th>
                      <th className="p-4 text-right text-sm font-semibold text-on-surface-variant">Total débité</th>
                      <th className="p-4 text-sm font-semibold text-on-surface-variant">Statut</th>
                      <th className="p-4 text-sm font-semibold text-on-surface-variant">Référence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-container-low">
                        <td className="p-4 text-sm text-on-surface-variant">{formatDateTime(p.createdAt)}</td>
                        <td className="p-4 text-sm text-on-surface">
                          {p.user.firstName} {p.user.lastName}
                          <span className="block text-xs text-on-surface-variant">{ROLE_LABEL[p.user.role]}</span>
                        </td>
                        <td className="p-4 text-sm text-on-surface-variant">{p.phone}</td>
                        <td className="p-4 text-right text-sm font-semibold text-on-surface">{formatPrice(p.amount)}</td>
                        <td className="p-4 text-right text-sm text-on-surface-variant">{formatPrice(p.fees)}</td>
                        <td className="p-4 text-right text-sm text-on-surface">{formatPrice(p.totalDebited)}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${PAYOUT_STATUS_CLASS[p.status]}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" /> {PAYOUT_STATUS_LABEL[p.status]}
                          </span>
                          {p.error && <span className="mt-1 block text-xs text-on-surface-variant">{p.error}</span>}
                        </td>
                        <td className="p-4 text-xs text-on-surface-variant">{p.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
