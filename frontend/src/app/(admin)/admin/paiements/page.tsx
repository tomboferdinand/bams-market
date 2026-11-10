"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { getAdminPayments } from "@/services/payment.service";
import type { AdminPayment, PaymentStatus } from "@/types/payment";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  EN_ATTENTE: "En attente", VALIDEE: "Confirmé", ECHOUEE: "Échoué", EXPIREE: "Expiré",
};
const STATUS_CLASS: Record<PaymentStatus, string> = {
  EN_ATTENTE: "bg-secondary-container/20 text-secondary border border-secondary/20",
  VALIDEE: "bg-primary-container/10 text-primary-container border border-primary-container/20",
  ECHOUEE: "bg-error-container text-on-error-container border border-error/20",
  EXPIREE: "bg-surface-variant text-on-surface-variant border border-outline-variant",
};

export default function AdminPaymentsPage() {
  const { loading: authLoading } = useRequireRole(["ADMINISTRATEUR"]);
  const [payments, setPayments] = useState<AdminPayment[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    getAdminPayments().then(setPayments).catch(() => setError(true));
  }, []);

  const filtered = (payments ?? []).filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(p.externalReference?.toLowerCase().includes(q) || String(p.orderId).includes(q))) return false;
    }
    return true;
  });

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todays = (payments ?? []).filter((p) => new Date(p.createdAt).toDateString() === today);
    const volumeToday = todays.filter((p) => p.status === "VALIDEE").reduce((s, p) => s + p.amount, 0);
    const validated = (payments ?? []).filter((p) => p.status === "VALIDEE").length;
    const pending = (payments ?? []).filter((p) => p.status === "EN_ATTENTE").length;
    const total = payments?.length ?? 0;
    const successRate = total > 0 ? Math.round((validated / total) * 100) : 0;
    return { volumeToday, validated, pending, successRate };
  }, [payments]);

  if (authLoading) return null;

  return (
    <DashboardShell title="Bam'S Market" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/paiements">
      <h1 className="text-2xl font-bold text-on-surface">Supervision des Paiements</h1>
      <p className="mt-2 text-on-surface-variant">Historique des transactions et traçabilité GoalPay (simulation).</p>

      {error && <ErrorState label="Impossible de charger les paiements." />}
      {!error && payments === null && <LoadingState label="Chargement..." />}

      {payments && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-gutter md:grid-cols-3">
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">Volume du jour (validé)</p>
              <p className="mt-2 text-3xl font-bold text-primary">{fmt(stats.volumeToday)} MGA</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">Transactions validées</p>
              <p className="mt-2 text-3xl font-bold text-on-surface">{stats.validated}</p>
              <p className="mt-1 text-sm text-tertiary">{stats.successRate}% de taux de succès</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant">En attente</p>
              <p className="mt-2 text-3xl font-bold text-secondary">{stats.pending}</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="flex flex-col items-center justify-between gap-4 border-b border-outline-variant bg-surface p-4 sm:flex-row">
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher référence, commande..."
                  className="w-full rounded-md border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm sm:w-auto"
              >
                <option value="">Tous les statuts</option>
                <option value="VALIDEE">Confirmé</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="ECHOUEE">Échoué</option>
                <option value="EXPIREE">Expiré</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState label="Aucune transaction ne correspond." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface">
                      <th className="p-4 text-sm font-semibold text-on-surface-variant">Référence</th>
                      <th className="p-4 text-sm font-semibold text-on-surface-variant">Commande #</th>
                      <th className="p-4 text-sm font-semibold text-on-surface-variant">Date &amp; Heure</th>
                      <th className="p-4 text-right text-sm font-semibold text-on-surface-variant">Montant (MGA)</th>
                      <th className="p-4 text-sm font-semibold text-on-surface-variant">Méthode</th>
                      <th className="p-4 text-sm font-semibold text-on-surface-variant">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-container-low">
                        <td className="p-4 text-sm font-medium text-on-surface">{p.externalReference ?? `PAY-${p.id}`}</td>
                        <td className="p-4 text-sm text-on-surface-variant">
                           <Link href={`/admin/commandes/${p.orderId}`} className="hover:underline">CMD-{p.orderId}</Link>
                        </td>
                        <td className="p-4 text-sm text-on-surface-variant">
                          {new Date(p.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-4 text-right text-sm font-semibold text-on-surface">{fmt(p.amount)}</td>
                        <td className="p-4 text-sm text-on-surface">{p.provider}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[p.status]}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" /> {STATUS_LABEL[p.status]}
                          </span>
                        </td>
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