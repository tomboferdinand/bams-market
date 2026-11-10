"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { COMMERCANT_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { getMerchantOrders } from "@/services/orders.service";
import type { MerchantOrder, OrderStatus } from "@/types/order";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

const TABS: { label: string; value: OrderStatus | "" }[] = [
  { label: "Toutes", value: "" },
  { label: "Payées", value: "PAYEE" },
  { label: "En préparation", value: "EN_PREPARATION" },
  { label: "En cours de livraison", value: "EN_COURS_DE_LIVRAISON" },
  { label: "Livrées", value: "LIVREE" },
];

const PAGE_SIZE = 10;

export default function MerchantOrdersPage() {
  const { loading: authLoading } = useRequireRole(["COMMERCANT"]);
  const [orders, setOrders] = useState<MerchantOrder[] | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    getMerchantOrders().then(setOrders).catch(() => setError(true));
  }, []);

  const filtered = (orders ?? []).filter((o) => {
    if (tab && o.status !== tab) return false;
    if (search) {
      const q = search.toLowerCase();
      const client = `${o.user.firstName} ${o.user.lastName}`.toLowerCase();
      if (!(String(o.id).includes(q) || client.includes(q))) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (authLoading) return null;

  return (
    <DashboardShell title="Orders" portalLabel="Merchant Portal" navItems={COMMERCANT_NAV} activeHref="/commercant/commandes">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Liste des Commandes</h2>
          <p className="mt-1 text-on-surface-variant">Gérez et suivez l&apos;état de toutes vos commandes clients.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher une commande..."
            className="w-full rounded-full border border-outline-variant bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => { setTab(t.value); setPage(1); }}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.value ? "border-primary-container bg-primary-container text-on-primary-container" : "border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorState label="Impossible de charger les commandes." />}
      {!error && orders === null && <LoadingState label="Chargement..." />}
      {!error && orders !== null && filtered.length === 0 && <EmptyState label="Aucune commande ne correspond." />}

      {pageItems.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant">N° Commande</th>
                  <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant">Client</th>
                  <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant">Articles</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-on-surface-variant">Montant (MGA)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-on-surface-variant">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {pageItems.map((order) => (
                  <tr key={order.id} className="group hover:bg-surface-container-lowest/50">
                    <td className="px-6 py-4 font-semibold text-on-surface">#CMD-{order.id}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-on-surface">
                          {initials(order.user.firstName, order.user.lastName)}
                        </div>
                        <span className="text-sm text-on-surface">{order.user.firstName} {order.user.lastName[0]}.</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {order.items.length} article{order.items.length > 1 ? "s" : ""}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-on-surface">{fmt(order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}</td>
                    <td className="px-6 py-4"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/commercant/commandes/${order.id}`}
                        className="flex items-center justify-end gap-1 text-sm font-semibold text-primary hover:text-primary-container"
                      >
                        Voir détail <ArrowRight size={16} className="opacity-0 transition-all group-hover:opacity-100" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-outline-variant bg-surface px-6 py-4">
            <span className="text-sm text-on-surface-variant">
              Affichage {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length} commandes
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`flex h-8 w-8 items-center justify-center rounded text-sm font-semibold ${
                      n === page ? "bg-primary-container text-on-primary-container" : "text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}