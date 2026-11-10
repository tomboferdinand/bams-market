"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User, Phone, Mail, MapPin, Truck, ImageOff, Undo2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { PaymentStatusBadge } from "@/features/admin/components/payment-status-badge";
import { getAdminOrderDetail, refundOrder } from "@/services/admin.service";
import { DELIVERY_STATUS_LABEL, ORDER_STATUS_LABEL } from "@/features/admin/labels";
import { formatPrice, formatDateTime } from "@/lib/format";
import type { AdminOrderDetail } from "@/types/admin";

export default function AdminOrderDetailPage() {
  const { loading: authLoading } = useRequireRole(["ADMINISTRATEUR"]);
  const params = useParams();
  const id = Number(params.id);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState(false);

  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    getAdminOrderDetail(id).then(setOrder).catch(() => setError(true));
  }
  useEffect(load, [id]);

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    setRefundError(null);
    setSaving(true);
    try {
      await refundOrder(id, reference.trim(), note.trim() || undefined);
      setReference("");
      setNote("");
      load();
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : "Enregistrement impossible.");
      load(); // l'état a peut-être changé (déjà remboursée)
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return null;

  return (
    <DashboardShell title="Bam'S Market" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/commandes">
      <Link href="/admin/commandes" className="mb-2 flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft size={16} /> Retour aux commandes
      </Link>

      {error && <ErrorState label="Commande introuvable." />}
      {!error && !order && <LoadingState label="Chargement..." />}

      {order && (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <h1 className="text-2xl font-bold text-on-background">Commande CMD-{order.id}</h1>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.payment?.status ?? null} />
          </div>
          <p className="-mt-4 mb-6 text-on-surface-variant">Passée le {formatDateTime(order.createdAt)}</p>

          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
            <div className="flex flex-col gap-gutter lg:col-span-2">
              <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
                <div className="border-b border-outline-variant p-6">
                  <h2 className="text-lg font-bold text-on-background">Articles commandés</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                        <th className="px-6 py-3">Produit</th>
                        <th className="px-6 py-3">Boutique</th>
                        <th className="px-6 py-3 text-center">Qté</th>
                        <th className="px-6 py-3 text-right">Prix unitaire</th>
                        <th className="px-6 py-3 text-right">Sous-total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant text-sm">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-variant">
                                {item.product.imageUrl ? (
                                  <Image src={item.product.imageUrl} alt={item.product.name} fill sizes="48px" className="object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-on-surface-variant"><ImageOff size={16} /></div>
                                )}
                              </div>
                              <span className="font-semibold text-on-background">{item.product.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant">{item.product.shop.name}</td>
                          <td className="px-6 py-4 text-center">{item.quantity}</td>
                          <td className="px-6 py-4 text-right">{formatPrice(item.unitPrice)} MGA</td>
                          <td className="px-6 py-4 text-right font-semibold">{formatPrice(item.unitPrice * item.quantity)} MGA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-on-background">Historique des statuts</h2>
                <ol className="space-y-3">
                  {order.statusHistory.map((h) => (
                    <li key={h.id} className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-on-surface">{ORDER_STATUS_LABEL[h.status]}</span>
                      <span className="text-on-surface-variant">{formatDateTime(h.changedAt)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="flex flex-col gap-gutter">
              <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-on-background">Client</h2>
                <div className="space-y-3 text-sm text-on-background">
                  <p className="flex items-center gap-2"><User size={16} className="text-on-surface-variant" /> {order.user.firstName} {order.user.lastName}</p>
                  {order.user.phone && <p className="flex items-center gap-2"><Phone size={16} className="text-on-surface-variant" /> {order.user.phone}</p>}
                  {order.user.email && <p className="flex items-center gap-2"><Mail size={16} className="text-on-surface-variant" /> {order.user.email}</p>}
                  <div className="flex items-start gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
                    <MapPin size={16} className="mt-0.5 text-primary" />
                    <div>
                      <p>{order.address.fullAddress}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{order.address.label} · {order.address.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-on-background">Résumé financier</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-on-surface-variant">Sous-total</span><span>{formatPrice(order.subtotal)} MGA</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Frais de livraison</span><span>{formatPrice(order.deliveryFee)} MGA</span></div>
                  <div className="flex justify-between border-t border-outline-variant pt-3 font-bold">
                    <span>Total</span><span className="text-primary">{formatPrice(order.total)} MGA</span>
                  </div>
                  {order.payment && (
                    <div className="space-y-2 border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
                      <div className="flex justify-between"><span>Référence</span><span>{order.payment.externalReference ?? `PAY-${order.payment.id}`}</span></div>
                      <div className="flex justify-between"><span>Commission plateforme</span><span>{formatPrice(order.payment.commissionAmount)} MGA</span></div>
                      <div className="flex justify-between"><span>Net commerçant</span><span>{formatPrice(order.payment.merchantAmount)} MGA</span></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-on-background"><Truck size={18} /> Livraison</h2>
                {order.delivery ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-on-surface">{DELIVERY_STATUS_LABEL[order.delivery.status]}</p>
                    <p className="text-on-surface-variant">
                      Livreur : {order.delivery.livreur ? `${order.delivery.livreur.firstName} ${order.delivery.livreur.lastName}` : "Non assigné"}
                    </p>
                    {order.delivery.deliveredAt && (
                      <p className="text-on-surface-variant">
                        {order.delivery.status === "ECHEC" ? "Échec le" : "Remise le"} {formatDateTime(order.delivery.deliveredAt)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">Aucune mission de livraison pour le moment.</p>
                )}
              </div>

              {order.status === "ECHOUEE" && order.payment?.status === "VALIDEE" && order.delivery?.status === "ECHEC" && (
                <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm" data-testid="refund-card">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-on-background"><Undo2 size={18} /> Remboursement</h2>
                  {order.refund ? (
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-primary">Remboursée : {formatPrice(order.refund.amount)} MGA</p>
                      <p className="text-on-surface-variant">Le {formatDateTime(order.refund.createdAt)} par {order.refund.admin.firstName} {order.refund.admin.lastName}</p>
                      <p className="text-on-surface-variant">Réf. transaction : {order.refund.reference}</p>
                      {order.refund.note && <p className="text-on-surface-variant">Note : {order.refund.note}</p>}
                    </div>
                  ) : (
                    <form onSubmit={handleRefund} className="space-y-3 text-sm">
                      <p className="rounded-lg bg-error-container/20 p-3 font-semibold text-on-error-container">
                        À rembourser : {formatPrice(order.payment.amount)} MGA
                      </p>
                      <p className="text-on-surface-variant">
                        Faites d&apos;abord le transfert Mobile Money au client (numéro du paiement ou du compte), puis enregistrez-le ici.
                      </p>
                      <label className="block">
                        <span className="mb-1 block text-on-surface-variant">Référence de la transaction</span>
                        <input
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          required minLength={3} maxLength={100}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-on-surface-variant">Note (facultatif)</span>
                        <input
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          maxLength={300}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
                        />
                      </label>
                      {refundError && <p className="text-error">{refundError}</p>}
                      <button
                        type="submit"
                        disabled={saving || reference.trim().length < 3}
                        className="w-full cursor-pointer rounded-md bg-primary px-4 py-2 font-semibold text-on-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Enregistrement..." : "Marquer comme remboursé"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}