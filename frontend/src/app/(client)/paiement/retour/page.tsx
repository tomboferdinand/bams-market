"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getLatestPayment, type LatestPayment } from "@/services/payment.service";
import { ApiError } from "@/services/api";
import { LoadingState } from "@/components/feedback/data-states";

type Hint = "success" | "canceled" | "failed";

const POLL_MS = 2000;
const POLL_MAX = 20; // ~40 s : le webhook GoalPay arrive en général en quelques secondes

function ReturnContent() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("r");
  const hint: Hint = raw === "canceled" || raw === "failed" ? raw : "success";

  const [payment, setPayment] = useState<LatestPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Le webhook est la seule source fiable : on interroge notre serveur jusqu'à connaître l'état réel.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    async function poll() {
      try {
        const p = await getLatestPayment();
        if (cancelled) return;
        setPayment(p);
        if (p.status === "VALIDEE") {
          router.replace(`/commande/${p.orderId}/paiement/succes`);
          return;
        }
        if (p.status !== "EN_ATTENTE" || hint !== "success") return; // état final, ou client revenu sans payer
        tries += 1;
        if (tries >= POLL_MAX) { setTimedOut(true); return; }
        setTimeout(poll, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Impossible de vérifier votre paiement.");
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [hint, router]);

  const orderId = payment?.orderId;
  const pending = payment?.status === "EN_ATTENTE";

  let title = "Vérification de votre paiement…";
  let message = "Nous attendons la confirmation de GoalPay. Ne fermez pas cette page.";
  let loading = true;

  if (error) {
    title = "Paiement à vérifier";
    message = `${error} Connectez-vous puis consultez votre commande pour connaître son état.`;
    loading = false;
  } else if (payment && !pending) {
    loading = false; // VALIDEE redirige ; ECHOUEE / EXPIREE affichés ci-dessous
    title = (payment.status as string) === "EXPIREE" ? "Délai de paiement dépassé" : "Le paiement n'a pas abouti";
    message = "Cette commande n'a pas été payée. Vous pouvez la consulter ou repasser commande.";
  } else if (payment && pending && hint !== "success") {
    loading = false;
    title = hint === "canceled" ? "Paiement annulé" : "Le paiement n'a pas abouti";
    message = "Votre commande n'est pas payée. Vous pouvez reprendre le paiement tant que le lien est valable.";
  } else if (timedOut) {
    loading = false;
    title = "Confirmation en cours";
    message = "Votre paiement n'est pas encore confirmé. Si vous avez été débité, la commande sera validée dès réception de la confirmation. Consultez-la dans quelques instants.";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-8">
      <main className="flex w-full max-w-md flex-col items-center rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
        {loading && <LoadingState label="Chargement..." />}
        <h1 className="mb-2 mt-2 text-xl font-bold text-primary">{title}</h1>
        <p className="mb-6 text-sm text-on-surface-variant">{message}</p>

        {!loading && (
          <div className="w-full space-y-3">
            {orderId && pending && hint !== "success" && (
              <Link
                href={`/commande/${orderId}/paiement`}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-primary font-semibold text-on-primary shadow-sm hover:bg-primary-container"
              >
                Reprendre le paiement
              </Link>
            )}
            {orderId && (
              <Link href={`/commande/${orderId}`} className="block text-center text-sm font-semibold text-primary hover:underline">
                Voir ma commande
              </Link>
            )}
            <Link href="/catalogue" className="block text-center text-sm text-on-surface-variant hover:text-primary hover:underline">
              Retour au catalogue
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnContent />
    </Suspense>
  );
}
