"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { verifyEmail } from "@/services/auth.service";
import { ApiError } from "@/services/api";

type Status = "loading" | "success" | "error";

function VerificationEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<Status>("loading");
    const [message, setMessage] = useState("");
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return; // bloque le second appel du Strict Mode en dev
        hasRun.current = true;

        if (!token) {
            setStatus("error");
            setMessage("Lien invalide : aucun jeton fourni.");
            return;
        }

        verifyEmail(token)
            .then(() => setStatus("success"))
            .catch((err) => {
                setStatus("error");
                setMessage(err instanceof ApiError ? err.message : "Une erreur est survenue.");
            });
    }, [token]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-surface-container-low p-4">
            <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
                {status === "loading" && (
                    <>
                        <Loader2 size={40} className="mx-auto mb-4 animate-spin text-primary" />
                        <p className="text-on-surface-variant">Vérification en cours...</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle2 size={48} className="mx-auto mb-4 text-primary" />
                        <h1 className="mb-2 text-xl font-bold text-on-surface">E-mail vérifié !</h1>
                        <p className="mb-6 text-sm text-on-surface-variant">
                            Votre adresse e-mail a été confirmée avec succès.
                        </p>
                        <Link href="/connexion" className="font-semibold text-primary hover:underline">
                            Se connecter
                        </Link>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle size={48} className="mx-auto mb-4 text-error" />
                        <h1 className="mb-2 text-xl font-bold text-on-surface">Échec de la vérification</h1>
                        <p className="mb-6 text-sm text-on-surface-variant">{message}</p>
                        <Link href="/connexion" className="font-semibold text-primary hover:underline">
                            Retour à la connexion
                        </Link>
                    </>
                )}
            </div>
        </main>
    );
}

export default function VerificationEmailPage() {
    return (
        <Suspense
            fallback={
                <main className="flex min-h-screen items-center justify-center bg-surface-container-low p-4">
                    <Loader2 size={40} className="animate-spin text-primary" />
                </main>
            }
        >
            <VerificationEmailContent />
        </Suspense>
    );
}