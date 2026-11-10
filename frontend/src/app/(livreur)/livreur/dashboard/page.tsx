"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Bike, CheckCircle2, ArrowRight, MapPin } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LIVREUR_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { getAvailableMissions, getMyDeliveries, getDeliveryHistory } from "@/services/deliveries.service";
import { formatPrice, isToday } from "@/lib/format";
import { WalletPanel } from "@/features/wallet/wallet-panel";
import type { Delivery } from "@/types/delivery";

interface DashboardData {
  available: Delivery[];
  active: Delivery[];
  history: Delivery[];
}

function MissionRow({ delivery }: { delivery: Delivery }) {
  const shop = delivery.order.items[0]?.product.shop;
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
      <div className="min-w-0">
        <p className="text-xs text-on-surface-variant">Commande #CMD-{delivery.order.id}</p>
        <p className="truncate font-semibold text-on-background">{shop?.name ?? "Boutique"}</p>
        <p className="mt-1 flex items-center gap-1 truncate text-sm text-on-surface-variant">
          <MapPin size={14} className="shrink-0" /> {delivery.order.address.fullAddress ?? [delivery.order.address.label, delivery.order.address.city].filter(Boolean).join(" — ")}
        </p>
      </div>
      <span className="shrink-0 font-semibold text-primary">{formatPrice(delivery.order.total)} MGA</span>
    </div>
  );
}

function Section({ title, href, items, empty }: { title: string; href: string; items: Delivery[]; empty: string }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-on-background">{title}</h3>
        <Link href={href} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Voir tout <ArrowRight size={16} />
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState label={empty} />
      ) : (
        <div className="space-y-3">
          {items.slice(0, 3).map((d) => <MissionRow key={d.id} delivery={d} />)}
        </div>
      )}
    </section>
  );
}

export default function LivreurDashboardPage() {
  const { user, loading } = useRequireRole(["LIVREUR"]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getAvailableMissions(), getMyDeliveries(), getDeliveryHistory()])
      .then(([available, active, history]) => setData({ available, active, history }))
      .catch(() => setError(true));
  }, []);

  if (loading || !user) return null;

  const done = data ? data.history.filter((d) => d.status === "LIVREE") : [];
  const failed = data ? data.history.length - done.length : 0;
  const doneToday = done.filter((d) => d.deliveredAt && isToday(d.deliveredAt)).length;

  return (
    <DashboardShell title="Tableau de bord" portalLabel="Espace Livreur" navItems={LIVREUR_NAV} activeHref="/livreur/dashboard">
      <h2 className="text-3xl font-bold text-on-background">Bonjour, {user.firstName}</h2>
      <p className="mt-1 text-on-surface-variant">Résumé de votre activité de livraison.</p>

      {error && <ErrorState label="Impossible de charger votre tableau de bord." />}
      {!error && !data && <LoadingState label="Chargement..." />}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Link href="/livreur/missions" className="flex flex-col justify-between rounded-xl bg-primary-container p-6 shadow-sm transition-transform hover:scale-[1.02]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest/20 text-on-primary-container">
                <Package size={24} />
              </div>
              <div className="mt-4">
                <p className="text-4xl font-bold text-on-primary-container">{data.available.length}</p>
                <p className="mt-1 text-sm font-semibold text-on-primary-container/90">Missions disponibles</p>
              </div>
            </Link>

            <div className="flex flex-col justify-between rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container/20 text-secondary">
                <Bike size={24} />
              </div>
              <div className="mt-4">
                <p className="text-4xl font-bold text-on-background">{data.active.length}</p>
                <p className="mt-1 text-sm font-semibold text-on-surface-variant">Livraison{data.active.length > 1 ? "s" : ""} en cours</p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-primary">
                <CheckCircle2 size={24} />
              </div>
              <div className="mt-4">
                <p className="text-4xl font-bold text-on-background">{done.length}</p>
                <p className="mt-1 text-sm font-semibold text-on-surface-variant">Livraisons terminées</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {doneToday} aujourd&apos;hui{failed > 0 ? ` · ${failed} échec${failed > 1 ? "s" : ""}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <WalletPanel />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Section
              title="Mes livraisons en cours"
              href="/livreur/livraisons"
              items={data.active}
              empty="Aucune livraison en cours."
            />
            <Section
              title="Missions disponibles"
              href="/livreur/missions"
              items={data.available}
              empty="Aucune mission disponible pour le moment."
            />
          </div>
        </>
      )}
    </DashboardShell>
  );
}