"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, MailCheck, Loader2, X } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { getCurrentUser, resendVerificationEmail } from "@/services/auth.service";
import { ApiError, EMAIL_NOT_VERIFIED_EVENT } from "@/services/api";
import { maskEmail } from "@/features/auth/mask-email";

// Nom et emplacement conservés : tous les écrans qui affichaient l'ancien bandeau affichent maintenant cette fenêtre.
const DISMISS_KEY = "bams_verification_dismissed";
const COOLDOWN_SECONDS = 60;

function readDismissed(userId: number): boolean {
    try {
        return sessionStorage.getItem(`${DISMISS_KEY}:${userId}`) === "1";
    } catch {
        return false;
    }
}

function writeDismissed(userId: number) {
    try {
        sessionStorage.setItem(`${DISMISS_KEY}:${userId}`, "1");
    } catch {
        /* stockage indisponible : la fenêtre se réaffichera au prochain chargement */
    }
}

type Notice = { type: "ok" | "err" | "info"; text: string };

export function VerificationBanner() {
    const { user, setUser } = useAuth();
    const [dismissed, setDismissed] = useState<boolean | null>(null);
    const [verified, setVerified] = useState(false);
    const [sending, setSending] = useState(false);
    const [checking, setChecking] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [shown, setShown] = useState(false);
    // Ouverte de force quand une action (commander, payer, retirer) exige un e-mail vérifié.
    const [forced, setForced] = useState(false);
    const primaryRef = useRef<HTMLButtonElement>(null);

    const userId = user?.id;
    const email = user?.email ?? null;
    const needsVerification = !!user && !!email && user.verificationStatus !== "VERIFIE";
    const open = verified || (needsVerification && (forced || dismissed === false));

    // L'état « déjà fermé » vient du navigateur : lu après le premier affichage.
    useEffect(() => {
        if (userId === undefined) return;
        setDismissed(readDismissed(userId));
    }, [userId]);

    // Le serveur a refusé une action faute d'e-mail vérifié : on rouvre la fenêtre, même si elle avait été fermée.
    useEffect(() => {
        const onBlocked = () => setForced(true);
        window.addEventListener(EMAIL_NOT_VERIFIED_EVENT, onBlocked);
        return () => window.removeEventListener(EMAIL_NOT_VERIFIED_EVENT, onBlocked);
    }, []);

    // Compte à rebours entre deux envois.
    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    // Animation d'ouverture.
    useEffect(() => {
        if (!open) {
            setShown(false);
            return;
        }
        const raf = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(raf);
    }, [open]);

    function dismiss() {
        setForced(false);
        if (userId !== undefined) writeDismissed(userId);
        setDismissed(true);
    }

    // Échap ferme, la page derrière ne défile plus, le focus va sur l'action principale.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") dismiss();
        };
        document.addEventListener("keydown", onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        primaryRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    async function handleResend() {
        setSending(true);
        setNotice(null);
        try {
            await resendVerificationEmail();
            setNotice({ type: "ok", text: "E-mail envoyé. Pensez à vérifier vos courriers indésirables." });
            setCooldown(COOLDOWN_SECONDS);
        } catch (err) {
            setNotice({ type: "err", text: err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez." });
            if (err instanceof ApiError && err.status === 429) setCooldown(COOLDOWN_SECONDS);
        } finally {
            setSending(false);
        }
    }

    async function handleCheck() {
        setChecking(true);
        setNotice(null);
        try {
            const fresh = await getCurrentUser();
            if (fresh?.verificationStatus === "VERIFIE") {
                setForced(false);
                setVerified(true);
                setUser(fresh);
                setTimeout(() => setVerified(false), 2200);
            } else {
                setNotice({
                    type: "info",
                    text: "Votre adresse n'est pas encore confirmée. Ouvrez le lien reçu par e-mail, puis revenez ici.",
                });
            }
        } finally {
            setChecking(false);
        }
    }

    if (!open) return null;

    const noticeClass =
        notice?.type === "err"
            ? "bg-error-container text-on-error-container"
            : notice?.type === "ok"
                ? "bg-primary-container/15 text-on-surface"
                : "bg-surface-container text-on-surface-variant";

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="presentation">
            <div
                onClick={dismiss}
                className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="verification-title"
                aria-describedby="verification-desc"
                className={`relative w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl ring-1 ring-outline-variant/40 transition-all duration-200 sm:p-8 ${
                    shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
                }`}
            >
                {!verified && (
                    <button
                        type="button"
                        onClick={dismiss}
                        aria-label="Fermer"
                        className="absolute right-3 top-3 rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
                    >
                        <X size={18} />
                    </button>
                )}

                <div className="flex flex-col items-center text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/15 text-primary">
                        {verified ? <MailCheck size={30} /> : <Mail size={30} />}
                    </div>

                    {verified ? (
                        <>
                            <h2 id="verification-title" className="text-xl font-bold text-on-surface">Adresse vérifiée</h2>
                            <p id="verification-desc" className="mt-2 text-sm text-on-surface-variant">
                                Merci ! Votre compte est maintenant sécurisé.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 id="verification-title" className="text-xl font-bold text-on-surface">Vérifiez votre adresse e-mail</h2>
                            <p id="verification-desc" className="mt-2 text-sm leading-6 text-on-surface-variant">
                                Nous avons envoyé un lien de confirmation à{" "}
                                <strong className="font-semibold text-on-surface">{email ? maskEmail(email) : ""}</strong>.
                                Cliquez dessus pour accéder à toutes les fonctionnalités de votre compte.
                            </p>
                            {forced && (
                                <p className="mt-3 rounded-lg bg-surface-container px-3 py-2 text-sm font-medium text-on-surface">
                                    Cette action nécessite une adresse e-mail vérifiée.
                                </p>
                            )}

                            <div className="mt-6 flex w-full flex-col gap-3">
                                <button
                                    ref={primaryRef}
                                    type="button"
                                    onClick={handleResend}
                                    disabled={sending || cooldown > 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {sending && <Loader2 size={16} className="animate-spin" />}
                                    {sending ? "Envoi..." : cooldown > 0 ? `Renvoyer dans ${cooldown} s` : "Renvoyer l'e-mail"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCheck}
                                    disabled={checking}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container disabled:opacity-60"
                                >
                                    {checking && <Loader2 size={16} className="animate-spin" />}
                                    J&apos;ai confirmé mon e-mail
                                </button>
                                <button
                                    type="button"
                                    onClick={dismiss}
                                    className="py-1 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:underline"
                                >
                                    Plus tard
                                </button>
                            </div>

                            <div aria-live="polite" className="mt-4 w-full">
                                {notice && <p className={`rounded-lg px-3 py-2 text-sm ${noticeClass}`}>{notice.text}</p>}
                            </div>
                            <p className="mt-3 text-xs text-on-surface-variant">Le lien est valable 24 heures.</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
