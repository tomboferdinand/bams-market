"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { activateRole } from "@/services/role-requests.service";
import { getCurrentUser } from "@/services/auth.service";
import { ApiError } from "@/services/api";
import { ROLE_HOME } from "@/lib/routes";
import { REQUESTED_ROLE_LABEL } from "@/features/role-requests/labels";
import type { RequestedRole } from "@/types/role-request";

type Status = "loading" | "success" | "error";

function ActivateRoleContent() {
  const router = useRouter();
  const { setUser } = useAuth();
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<RequestedRole | null>(null);
  const [continuing, setContinuing] = useState(false);
  const hasRun = useRef(false);

  // Le jeton est à usage unique : l'appel ne doit partir qu'une fois (React rejoue les effets en développement).
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    if (!token) {
      setStatus("error");
      setMessage("Lien d'activation incomplet.");
      return;
    }
    activateRole(token)
      .then((res) => {
        setRole(res.role);
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.");
      });
  }, [token]);

  // Connecté : on recharge la session pour entrer directement dans le nouvel espace. Sinon : connexion.
  async function handleContinue() {
    setContinuing(true);
    const fresh = await getCurrentUser();
    if (fresh) {
      setUser(fresh);
      router.push(ROLE_HOME[fresh.role]);
    } else {
      router.push("/connexion");
    }
    setContinuing(false);
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center" role="status">
      {status === "loading" && (
        <>
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-on-surface-variant">Activation en cours...</p>
        </>
      )}
      {status === "success" && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container/15 text-primary">
            <CheckCircle2 size={26} />
          </div>
          <h2 className="text-lg font-bold text-on-surface">Espace activé</h2>
          <p className="text-sm text-on-surface-variant">
            Votre compte est maintenant {role ? REQUESTED_ROLE_LABEL[role].toLowerCase() : "partenaire"}. Bienvenue !
          </p>
          <Button type="button" className="mt-2 w-auto" loading={continuing} onClick={handleContinue}>
            Accéder à mon espace
          </Button>
        </>
      )}
      {status === "error" && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-container text-on-error-container">
            <XCircle size={26} />
          </div>
          <h2 className="text-lg font-bold text-on-surface">Activation impossible</h2>
          <p className="text-sm text-on-surface-variant">{message}</p>
          <p className="text-sm text-on-surface-variant">
            Connectez-vous, puis ouvrez{" "}
            <Link href="/devenir-partenaire" className="font-semibold text-primary hover:underline">
              Devenir partenaire
            </Link>{" "}
            pour recevoir un nouveau lien.
          </p>
        </>
      )}
    </div>
  );
}

export default function ActiverRolePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-container-lowest p-3 sm:p-6 md:p-8">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-outline-variant/30 bg-surface shadow-sm">
        <div className="absolute left-0 top-0 h-1 w-full bg-primary" />
        <div className="p-5 sm:p-8 md:p-10">
          <div className="mb-6 text-center md:mb-8">
            <h1 className="text-xl font-bold leading-7 text-primary sm:text-2xl sm:leading-8 md:text-3xl md:leading-9.5">
              Bam&apos;S Market
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant md:text-base">Activation de votre espace</p>
          </div>
          <Suspense fallback={null}>
            <ActivateRoleContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
