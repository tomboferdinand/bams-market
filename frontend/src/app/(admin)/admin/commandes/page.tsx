"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { PaymentStatusBadge } from "@/features/admin/components/payment-status-badge";
import { getAdminOrders } from "@/services/admin.service";
import { ORDER_STATUS_LABEL } from "@/features/admin/labels";
import { formatPrice, formatDateTime } from "@/lib/format";
import type { AdminOrderListItem } from "@/types/admin";
import type { OrderStatus } from "@/types/order";

export default function AdminOrdersPage() {
  const { loading: authLoading } = useRequireRole(["ADMINISTRATEUR"]);
  const [orders, setOrders] = useState<AdminOrderListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<"" | OrderStatus>("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getAdminOrders().then(setOrders).catch(() => setError(true));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^cmd-?#?/, "").replace(/^#/, "");
    return (orders ?? []).filter((o) => {
      if (status && o.status !== status) return false;
      if (!q) return true;
      return (
        String(o.id).includes(q) ||
        `${o.user.firstName} ${o.user.lastName}`.toLowerCase().includes(q)
      );
    });
  }, [orders, status, query]);

  if (authLoading) return null;

  return (
    <DashboardShell title="Bam'S Market" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/commandes">
      <h1 className="text-2xl font-bold text-on-background md:text-3xl">Commandes</h1>
      <p className="mb-6 mt-1 text-on-surface-variant">Toutes les commandes de la plateforme.</p>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-on-surface-variant">Statut</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "" | OrderStatus)}
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
          >
            <option value="">Tous</option>
            {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-on-surface-variant">Recherche (n° de commande ou client)</span>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="29, Dupont…"
              className="w-full rounded-lg border border-outline-variant bg-surface py-2 pl-9 pr-3"
            />
          </div>
        </label>
      </div>

      {error && <ErrorState label="Impossible de charger les commandes." />}
      {!error && orders === null && <LoadingState label="Chargement..." />}

      {orders && (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="px-6 py-3">Commande</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3">Statut</th>
                  <th className="px-6 py-3">Paiement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-sm">
                {shown.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">Aucune commande.</td></tr>
                )}
                {shown.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-container-low">
                    <td className="px-6 py-4">
                      <Link href={`/admin/commandes/${o.id}`} className="font-semibold text-primary hover:underline">CMD-{o.id}</Link>
                    </td>
                    <td className="px-6 py-4">{o.user.firstName} {o.user.lastName}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatDateTime(o.createdAt)}</td>
                    <td className="px-6 py-4 text-right font-semibold">{formatPrice(o.total)} MGA</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge status={o.status} />
                        {o.status === "ECHOUEE" && o.payment?.status === "VALIDEE" && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${o.refund ? "bg-primary/10 text-primary" : "bg-error-container text-on-error-container"}`}>
                            {o.refund ? "Remboursée" : "À rembourser"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4"><PaymentStatusBadge status={o.payment?.status ?? null} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-outline-variant px-6 py-3 text-sm text-on-surface-variant">
            {shown.length} commande{shown.length > 1 ? "s" : ""} sur {orders.length}
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
