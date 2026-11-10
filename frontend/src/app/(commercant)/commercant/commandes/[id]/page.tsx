"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Truck, CreditCard, User, MapPin, ImageOff, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { COMMERCANT_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { getMerchantOrder, markOrderAsPreparing } from "@/services/orders.service";
import { ApiError } from "@/services/api";
import type { MerchantOrder } from "@/types/order";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function MerchantOrderDetailPage() {
  const { loading: authLoading } = useRequireRole(["COMMERCANT"]);
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [order, setOrder] = useState<MerchantOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getMerchantOrder(id).then(setOrder).catch(() => setError("Commande introuvable ou ne concernant pas votre boutique."));
  }, [id]);

  async function handlePrepare() {
    setPreparing(true);
    setError(null);
    try {
      const updated = await markOrderAsPreparing(id);
      setOrder(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setPreparing(false);
    }
  }

  const subtotal = order?.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) ?? 0;

  if (authLoading) return null;

  return (
    <DashboardShell title="Commandes" portalLabel="Espace Commerçant" navItems={COMMERCANT_NAV} activeHref="/commercant/commandes">
      {error && !order && <ErrorState label={error} />}
      {!error && !order && <LoadingState label="Chargement..." />}

      {order && (
        <>
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <button onClick={() => router.push("/commercant/commandes")} className="mb-2 flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                <ArrowLeft size={16} /> Retour aux commandes
              </button>
              <h1 className="text-2xl font-bold text-on-background">Commande #CMD-{order.id}</h1>
            </div>
            {order.status === "PAYEE" && (
              <button
                disabled={preparing}
                onClick={handlePrepare}
                className="flex h-11 w-full items-center justify-center gap-2 rounded bg-primary px-6 font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-60 md:w-auto"
              >
                <Truck size={20} /> {preparing ? "Confirmation..." : "Marquer comme prête pour expédition"}
              </button>
            )}
          </div>

          {success && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-surface-container-highest p-4 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="font-semibold text-on-background">Action confirmée</p>
                <p className="text-sm text-on-surface-variant">La commande #CMD-{order.id} est maintenant prête pour l&apos;expédition.</p>
              </div>
            </div>
          )}
          {error && order && <p className="mb-4 text-sm text-error">{error}</p>}

          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
            <div className="flex flex-col gap-gutter lg:col-span-2">
              <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-on-background">Détails de la commande</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Date de commande</p>
                    <p className="text-on-background">
                      {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Méthode de paiement</p>
                    <div className="flex items-center gap-2 text-on-background">
                      <CreditCard size={18} className="text-on-surface-variant" /> Mobile Money (GoalPay)
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Statut actuel</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
                <div className="border-b border-outline-variant p-6">
                  <h2 className="text-lg font-bold text-on-background">Articles commandés</h2>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Produit</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Qté</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Prix unitaire</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Sous-total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="flex items-center gap-4 px-6 py-4">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-surface-variant">
                            {item.product.imageUrl ? (
                              <div className="relative h-full w-full"><Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" /></div>
                            ) : (
                              <div className="flex h-full items-center justify-center text-on-surface-variant"><ImageOff size={16} /></div>
                            )}
                          </div>
                          <span className="font-semibold text-on-background">{item.product.name}</span>
                        </td>
                        <td className="px-6 py-4 text-center text-on-background">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-on-background">{fmt(item.unitPrice)} MGA</td>
                        <td className="px-6 py-4 text-right font-semibold text-on-background">{fmt(item.unitPrice * item.quantity)} MGA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-gutter">
              <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-on-background">Informations Client</h2>
                <div className="space-y-4">
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Nom du client</p>
                    <p className="flex items-center gap-2 text-on-background">
                      <User size={18} className="text-on-surface-variant" /> {order.user?.firstName} {order.user?.lastName ? `${order.user.lastName.charAt(0)}.` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Zone de livraison</p>
                    <div className="mt-1 flex items-start gap-3 rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
                      <MapPin size={20} className="mt-0.5 text-primary" />
                      <div>
                        <p className="text-on-background">{order.address.city}</p>
                        <p className="mt-1 font-semibold text-primary">{order.address.label}</p>
                        <p className="mt-2 text-xs text-on-surface-variant">Le livreur récupère le colis chez vous et gère le contact avec le client.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-on-background">Résumé financier</h2>
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-on-background">
                    Total de vos articles ({order.items.length})
                  </span>
                  <span className="text-lg font-bold text-primary">{fmt(subtotal)} MGA</span>
                </div>
                <p className="mt-3 text-xs italic text-on-surface-variant">
                  Frais de livraison de la commande : {fmt(order.deliveryFee)} MGA (hors total).
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}