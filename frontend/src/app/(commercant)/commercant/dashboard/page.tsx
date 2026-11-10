"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { COMMERCANT_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { ShopBanner } from "@/features/dashboard/components/shop-banner";
import { computeMerchantStats, shopAmount } from "@/features/dashboard/merchant-stats";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { getMyShop } from "@/services/shops.service";
import { getMyProducts } from "@/services/products.service";
import { getMerchantOrders } from "@/services/orders.service";
import { formatPrice, formatDateTime } from "@/lib/format";
import { WalletPanel } from "@/features/wallet/wallet-panel";
import type { Shop } from "@/types/shop";
import type { Product } from "@/types/product";
import type { MerchantOrder } from "@/types/order";

interface DashboardData {
  shop: Shop | null;
  products: Product[];
  orders: MerchantOrder[];
}

function StatCard({ label, value, hint, alert }: { label: string; value: string; hint: string; alert?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-4 shadow-sm ${
        alert ? "border-error/40 bg-error-container/20" : "border-outline-variant bg-surface"
      }`}
    >
      <span className={`text-xs font-semibold uppercase tracking-wider ${alert ? "text-error" : "text-on-surface-variant"}`}>
        {label}
      </span>
      <span className="text-2xl font-bold text-on-surface">{value}</span>
      <span className="text-xs text-on-surface-variant">{hint}</span>
    </div>
  );
}

export default function CommercantDashboardPage() {
  const { loading } = useRequireRole(["COMMERCANT"]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const shop = await getMyShop(); // null si aucune boutique (404)
        if (!shop) {
          setData({ shop: null, products: [], orders: [] });
          return;
        }
        const [products, orders] = await Promise.all([getMyProducts(), getMerchantOrders()]);
        setData({ shop, products, orders });
      } catch {
        setError(true);
      }
    }
    load();
  }, []);

  const stats = useMemo(
    () => (data ? computeMerchantStats(data.products, data.orders) : null),
    [data],
  );

  if (loading) return null;

  return (
    <DashboardShell title="Tableau de Bord" portalLabel="Merchant Portal" navItems={COMMERCANT_NAV} activeHref="/commercant/dashboard">
      {error && <ErrorState label="Impossible de charger votre tableau de bord." />}
      {!error && !data && <LoadingState label="Chargement..." />}

      {data && stats && (
        <>
          <ShopBanner shop={data.shop} />

          <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Chiffre d'affaires"
              value={`${formatPrice(stats.revenue)} MGA`}
              hint="Ventes brutes de votre boutique, hors livraison"
            />
            <StatCard
              label="Commandes payées"
              value={formatPrice(stats.paidOrders)}
              hint={stats.toPrepare > 0 ? `${stats.toPrepare} à préparer` : "Aucune commande à préparer"}
            />
            <StatCard
              label="Produits actifs"
              value={formatPrice(stats.activeProducts)}
              hint="Produits désactivés exclus"
            />
            <StatCard
              label="Rupture de stock"
              value={formatPrice(stats.outOfStock)}
              hint={stats.outOfStock > 0 ? "À réapprovisionner" : "Aucune rupture"}
              alert={stats.outOfStock > 0}
            />
          </div>

          <WalletPanel />

          <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant p-4">
              <h2 className="text-lg font-bold text-on-surface">Commandes récentes</h2>
              <Link href="/commercant/commandes" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Voir tout <ArrowRight size={16} />
              </Link>
            </div>

            {stats.recentOrders.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  label={
                    data.shop?.status === "VALIDEE"
                      ? "Aucune commande payée pour le moment."
                      : "Aucune commande. Votre boutique doit être validée pour commencer à vendre."
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-lowest text-xs uppercase tracking-wider text-on-surface-variant">
                      <th className="px-4 py-3 font-semibold">N° Commande</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Client</th>
                      <th className="px-4 py-3 text-right font-semibold">Montant (MGA)</th>
                      <th className="px-4 py-3 font-semibold">Statut</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-sm">
                    {stats.recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-surface-container-lowest">
                        <td className="px-4 py-3 font-medium text-on-surface">#CMD-{o.id}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{formatDateTime(o.createdAt)}</td>
                        <td className="px-4 py-3 text-on-surface">{o.user.firstName} {o.user.lastName[0]}.</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">{formatPrice(shopAmount(o))}</td>
                        <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/commercant/commandes/${o.id}`}
                            className="rounded border border-primary px-3 py-1 text-sm font-semibold text-primary hover:bg-primary-container/10"
                          >
                            Voir
                          </Link>
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