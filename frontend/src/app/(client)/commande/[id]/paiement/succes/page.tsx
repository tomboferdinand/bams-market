"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Truck, ShoppingBasket, Wallet } from "lucide-react";
import { getOrder } from "@/services/orders.service";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import type { Order } from "@/types/order";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function PaymentSuccessPage() {
  const params = useParams();
  const orderId = Number(params.id);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getOrder(orderId).then(setOrder).catch(() => setError(true));
  }, [orderId]);

  // Garde-fou : cette page ne s'affiche que pour une commande réellement payée.
  const unpaid = !!order && ["EN_ATTENTE_PAIEMENT", "ANNULEE", "ECHOUEE"].includes(order.status);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      {error && <ErrorState label="Impossible de charger la commande." />}
      {!error && !order && <LoadingState label="Chargement..." />}
      {unpaid && (
        <div className="flex flex-col items-center gap-4">
          <ErrorState label="Cette commande n'a pas été payée." />
          <Link href={`/commande/${orderId}`} className="font-semibold text-primary hover:underline">
            Voir ma commande
          </Link>
        </div>
      )}
      {order && !unpaid && (
        <main className="relative flex w-full max-w-2xl flex-col items-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-surface-container-lowest bg-primary-container text-on-primary-container shadow-sm">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-primary md:text-3xl">Merci pour votre commande !</h1>
          <p className="mb-6 text-on-surface-variant">Votre paiement a été traité avec succès.</p>

          <div className="mb-6 w-full rounded-lg border border-outline-variant bg-surface-container-low p-6 text-left">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Numéro de commande</p>
                <p className="font-semibold text-on-background">CMD-{order.id}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Date</p>
                <p className="font-semibold text-on-background">
                  {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Moyen de paiement</p>
                <div className="flex items-center gap-2 font-semibold text-on-background">
                  <Wallet size={18} className="text-on-surface-variant" /> Mobile Money via GoalPay
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Montant total payé</p>
                <p className="text-lg font-bold text-primary">{fmt(order.total)} MGA</p>
              </div>
            </div>
            <hr className="my-4 border-outline-variant" />
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-on-surface-variant">Résumé rapide</p>
              <ul className="space-y-1 text-sm">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.product.name} × {item.quantity}</span>
                    <span>{fmt(item.unitPrice * item.quantity)} MGA</span>
                  </li>
                ))}
                <li className="flex justify-between text-on-surface-variant">
                  <span>Frais de livraison</span>
                  <span>{fmt(order.deliveryFee)} MGA</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Link href={`/commande/${order.id}`} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary shadow-sm hover:opacity-90">
              <Truck size={20} /> Suivre ma commande
            </Link>
            <Link href="/catalogue" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-outline font-semibold text-on-surface hover:bg-surface-variant">
              <ShoppingBasket size={20} /> Continuer les achats
            </Link>
          </div>
        </main>
      )}
    </div>
  );
}
