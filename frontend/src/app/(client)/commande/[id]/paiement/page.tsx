"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { getOrder } from "@/services/orders.service";
import { initiatePayment, simulatePaymentCallback, type CheckoutPayment } from "@/services/payment.service";
import { ApiError } from "@/services/api";
import type { Order } from "@/types/order";
import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";
import { reorderItems } from "@/features/orders/reorder";
import { VerificationBanner } from "@/components/layout/verification-banner";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params.id);
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<CheckoutPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const { refreshCount } = useCart();
  const [reordering, setReordering] = useState(false);

  async function handleReorder() {
    if (!order) return;
    setReordering(true);
    const { added } = await reorderItems(order);
    refreshCount();
    if (added === 0) {
      setError("Aucun article n'a pu être remis dans le panier (produits indisponibles).");
      setReordering(false);
      return;
    }
    router.push("/panier");
  }

  useEffect(() => {
    Promise.all([getOrder(orderId), initiatePayment(orderId)])
      .then(([o, p]) => { setOrder(o); setPayment(p); })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Impossible d'initier le paiement."));
  }, [orderId]);

  async function handleOutcome(outcome: "SUCCESS" | "FAILURE") {
    if (!payment) return;
    setProcessing(true);
    setError(null);
    try {
      const updated = await simulatePaymentCallback(payment.id, outcome);
      if (updated.status === "VALIDEE") {
        router.push(`/commande/${orderId}/paiement/succes`);
      } else {
        setPayment(updated);
        setError("Le paiement a échoué. Cette commande n'a pas été payée.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VerificationBanner />
      <main className="flex flex-grow items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
            <div className="mb-4 flex items-center justify-center rounded-full bg-tertiary-container/10 p-3 text-tertiary-container">
              <Lock size={32} />
            </div>
            <h1 className="mb-2 text-xl font-bold text-primary">Paiement GoalPay</h1>
            <p className="mb-6 text-sm text-on-surface-variant">
              {payment?.checkoutUrl
                ? "Vous allez payer sur la page sécurisée de GoalPay (MVola, Orange Money, Airtel Money)."
                : "Mode démonstration : la passerelle GoalPay réelle (MVola, Orange Money, Airtel Money) n'est pas encore connectée."}
            </p>

            {order && (
              <div className="mb-6 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low p-4">
                <div className="mb-2 flex items-center justify-between border-b border-outline-variant/30 pb-2">
                  <span className="text-xs text-on-surface-variant">Référence de commande</span>
                  <span className="text-sm font-semibold text-on-surface">CMD-{order.id}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-on-surface-variant">Montant total</span>
                  <span className="text-lg font-bold text-primary">{fmt(order.total)} MGA</span>
                </div>
              </div>
            )}

            {error && <p className="mb-4 text-sm text-error">{error}</p>}

            {!payment && !error && (
              <div className="flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-l-transparent" />
              </div>
            )}

            {payment && payment.status === "EN_ATTENTE" && payment.checkoutUrl && (
              <div className="w-full space-y-3">
                <a
                  href={payment.checkoutUrl}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary shadow-sm hover:bg-primary-container"
                >
                  Payer avec GoalPay
                </a>
                <p className="text-xs text-on-surface-variant">
                  Le lien de paiement est valable environ 10 minutes. Les frais GoalPay éventuels sont affichés avant la confirmation.
                </p>
                <Link
                  href={`/commande/${orderId}`}
                  className="block pt-2 text-center text-sm text-on-surface-variant hover:text-primary hover:underline"
                >
                  Revoir ma commande
                </Link>
              </div>
            )}

            {payment && payment.status === "EN_ATTENTE" && !payment.checkoutUrl && (
              <div className="w-full space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Mode simulation (démo)</p>
                <button
                  disabled={processing}
                  onClick={() => handleOutcome("SUCCESS")}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary shadow-sm hover:bg-primary-container disabled:opacity-60"
                >
                  Simuler un paiement réussi
                </button>
                <button
                  disabled={processing}
                  onClick={() => handleOutcome("FAILURE")}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-error font-semibold text-error hover:bg-error-container/10 disabled:opacity-60"
                >
                  Simuler un échec
                </button>
                <Link
                  href={`/commande/${orderId}`}
                  className="block pt-2 text-center text-sm text-on-surface-variant hover:text-primary hover:underline"
                >
                  Annuler et revoir ma commande
                </Link>
              </div>
            )}

            {((payment && payment.status !== "EN_ATTENTE") || (error && !payment)) && (
              <div className="w-full space-y-3">
                {payment && (
                  <button
                    disabled={reordering}
                    onClick={handleReorder}
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-primary font-semibold text-on-primary shadow-sm hover:bg-primary-container disabled:opacity-60"
                  >
                    {reordering ? "Ajout au panier..." : "Commander à nouveau"}
                  </button>
                )}
                <Link href={`/commande/${orderId}`} className="block text-center text-sm font-semibold text-primary hover:underline">
                  Voir ma commande
                </Link>
                <Link href="/catalogue" className="block text-center text-sm text-on-surface-variant hover:text-primary hover:underline">
                  Retour au catalogue
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="flex w-full flex-col items-center gap-2 border-t border-outline-variant bg-surface-container-low px-8 py-4 md:flex-row md:justify-center">
        <span className="mr-4 text-lg font-bold text-primary opacity-50">Bam&apos;S Market</span>
        <p className="text-sm text-on-surface-variant">Paiement sécurisé via GoalPay. Vos données sont cryptées.</p>
      </footer>
    </div>
  );
}
