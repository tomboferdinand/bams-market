"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Wallet as WalletIcon, Lock, Phone, ArrowDownToLine, ShieldCheck, Mail } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { ApiError } from "@/services/api";
import { formatPrice, formatDateTime } from "@/lib/format";
import { getWallet, getPayoutSettings, getMyPayouts, previewPayout, createPayout } from "@/services/wallet.service";
import type { Wallet, PayoutSettings, Payout, PayoutPreview } from "@/types/wallet";
import { maskPhone } from "./phone-mask";
import { parseAmount, amountIssue, withdrawBlocker, ENTRY_LABELS, PAYOUT_STATUS_LABELS } from "./wallet-utils";

const INPUT = "w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface";
const BTN = "rounded bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50";
const BTN_LINE = "rounded border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50";

// Adresse de contact de l'administration (optionnelle) : NEXT_PUBLIC_SUPPORT_EMAIL dans frontend/.env.local.
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Une erreur est survenue.");

function Amount({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-4 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{label}</span>
      <span className="text-2xl font-bold text-on-surface">{formatPrice(value)} MGA</span>
      <span className="text-xs text-on-surface-variant">{hint}</span>
    </div>
  );
}

/** E-mail pré-rempli : il identifie le compte pour que l'administrateur retrouve le demandeur sans ambiguïté. */
function buildSupportMailto(
  to: string,
  account: { name: string; email?: string; id?: number; role?: string },
  currentPhone: string | null,
) {
  const lines = [
    "Bonjour,",
    "",
    "Je demande le changement du numéro de retrait de mon compte Bam'S Market.",
    "",
    `Nom : ${account.name}`,
    `E-mail du compte : ${account.email ?? "(à préciser)"}`,
    `Identifiant : ${account.id ?? "(à préciser)"}`,
    `Rôle : ${account.role ?? "(à préciser)"}`,
    `Numéro actuel : ${currentPhone ? maskPhone(currentPhone) : "aucun"}`,
    "Nouveau numéro souhaité : ",
    "Motif : ",
    "",
    "Merci d'écrire depuis l'adresse e-mail du compte.",
  ];
  const subject = "Demande de changement de numéro de retrait";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\r\n"))}`;
}

export function WalletPanel() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [settings, setSettings] = useState<PayoutSettings | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadError, setLoadError] = useState(false);

  // Retrait en deux étapes : 1) montant et récapitulatif, 2) confirmation par le mot de passe.
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState<PayoutPreview | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      const [w, s, p] = await Promise.all([getWallet(), getPayoutSettings(), getMyPayouts()]);
      setWallet(w);
      setSettings(s);
      setPayouts(p);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loadError) return <ErrorState label="Impossible de charger votre portefeuille." />;
  if (!wallet || !settings) return <LoadingState label="Chargement du portefeuille..." />;

  const blocker = withdrawBlocker(settings, wallet.available, formatDateTime);
  const parsedAmount = parseAmount(amount);
  const issue = amount ? amountIssue(parsedAmount, settings, wallet.available) : null;

  function resetWithdrawal() {
    setAmount("");
    setPassword("");
    setPreview(null);
  }

  /** Étape 1 : le serveur valide le montant, calcule les frais, et on affiche le récapitulatif. */
  async function onContinue(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (issue || parsedAmount === null) return setMessage({ type: "err", text: issue ?? "Saisissez un montant." });
    setBusy(true);
    try {
      setPreview(await previewPayout(parsedAmount));
      setPassword("");
    } catch (err) {
      setMessage({ type: "err", text: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  /** Étape 2 : exécution du retrait, confirmée par le mot de passe. */
  async function onConfirm(e: FormEvent) {
    e.preventDefault();
    if (!preview) return;
    setMessage(null);
    if (!password) return setMessage({ type: "err", text: "Saisissez votre mot de passe pour confirmer le retrait." });
    setBusy(true);
    try {
      const p = await createPayout(preview.amount, password);
      resetWithdrawal();
      setMessage({
        type: p.status === "ECHOUE" ? "err" : "ok",
        text:
          p.status === "REUSSI"
            ? `Retrait de ${formatPrice(p.amount)} MGA effectué vers ${p.phone}. Un e-mail de confirmation vous a été envoyé.`
            : p.status === "ECHOUE"
              ? "Le retrait a échoué, votre solde a été rétabli."
              : "Retrait en cours de traitement. Vous recevrez un e-mail à la fin du traitement.",
      });
    } catch (err) {
      setPassword("");
      setMessage({ type: "err", text: errMsg(err) });
    } finally {
      setBusy(false);
      await reload();
    }
  }

  return (
    <section className="mb-6 space-y-4" aria-label="Mes gains">
      <h2 className="flex items-center gap-2 text-lg font-bold text-on-surface">
        <WalletIcon size={20} /> Mes gains
      </h2>

      {settings.mode === "simulation" && (
        <p className="rounded border border-outline-variant bg-surface-container-lowest p-3 text-xs text-on-surface-variant">
          Mode simulation : les retraits sont enregistrés mais aucun argent réel n&apos;est versé.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Amount label="Solde" value={wallet.balance} hint="Gains crédités à chaque livraison confirmée" />
        <Amount
          label="Disponible au retrait"
          value={wallet.available}
          hint={settings.holdHours > 0 ? `Retirable ${settings.holdHours} h après la livraison` : "Retirable dès la livraison confirmée"}
        />
      </div>

      {message && (
        <p
          role="status"
          className={`rounded p-3 text-sm ${message.type === "ok" ? "bg-surface-container-high text-on-surface" : "bg-error-container/30 text-on-error-container"}`}
        >
          {message.text}
        </p>
      )}

      {/* Numéro de réception : verrouillé */}
      <div className="space-y-2 rounded-lg border border-outline-variant bg-surface p-4">
        <h3 className="flex items-center gap-2 font-semibold text-on-surface">
          <Phone size={16} /> Numéro de réception
        </h3>
        {settings.payoutPhone ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-on-surface">
            <Lock size={14} aria-hidden />
            <strong data-testid="payout-phone" title="Numéro de retrait verrouillé">{maskPhone(settings.payoutPhone)}</strong>
            <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant">Verrouillé</span>
          </p>
        ) : (
          <p className="text-sm text-on-surface-variant">Aucun numéro enregistré.</p>
        )}
        <p className="text-xs text-on-surface-variant">
          Ce numéro a été enregistré lors de l&apos;activation de votre espace. Pour votre sécurité, il ne peut pas être modifié depuis votre compte :
          toute modification est faite par l&apos;administration, après vérification. Le numéro complet vous est rappelé avant chaque retrait.
        </p>
        {SUPPORT_EMAIL && (
          <a
            href={buildSupportMailto(
              SUPPORT_EMAIL,
              {
                name: user ? `${user.firstName} ${user.lastName}` : "",
                ...(user as unknown as { email?: string; id?: number; role?: string } | null),
              },
              settings.payoutPhone,
            )}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Mail size={14} aria-hidden /> Contacter l&apos;administrateur
          </a>
        )}
      </div>

      {/* Retrait */}
      <div className="space-y-3 rounded-lg border border-outline-variant bg-surface p-4">
        <h3 className="flex items-center gap-2 font-semibold text-on-surface">
          <ArrowDownToLine size={16} /> Retirer mon argent
        </h3>
        {blocker ? (
          <p className="text-sm text-on-surface-variant">{blocker}</p>
        ) : !preview ? (
          <form className="space-y-3" onSubmit={onContinue}>
            <input
              className={INPUT}
              inputMode="numeric"
              placeholder={`Montant en MGA (min ${formatPrice(settings.minAmount)})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Montant à retirer"
            />
            {issue && <p className="text-xs text-error">{issue}</p>}
            <p className="text-xs text-on-surface-variant">
              Il vous reste {formatPrice(settings.dailyRemaining)} MGA à retirer aujourd&apos;hui (plafond sur 24 h).
            </p>
            <button className={BTN} disabled={busy || !amount}>Continuer</button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={onConfirm}>
            <div role="group" className="space-y-1 rounded border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface" aria-label="Récapitulatif du retrait">
              <p>Vous recevez <strong>{formatPrice(preview.amount)} MGA</strong></p>
              <p>Sur le numéro <strong>{preview.phone}</strong></p>
              <p>Frais : {formatPrice(preview.fees)} MGA</p>
              <p>Débit total de votre solde : <strong>{formatPrice(preview.totalDebited)} MGA</strong></p>
            </div>
            <p className="flex items-center gap-2 text-sm font-semibold text-on-surface">
              <ShieldCheck size={16} /> Confirmez avec votre mot de passe
            </p>
            <input
              className={INPUT}
              type="password"
              autoComplete="current-password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Mot de passe de confirmation"
            />
            <div className="flex flex-wrap gap-3">
              <button className={BTN} disabled={busy || !password}>Confirmer le retrait</button>
              <button type="button" className={BTN_LINE} disabled={busy} onClick={resetWithdrawal}>Modifier le montant</button>
            </div>
          </form>
        )}
      </div>

      {/* Historique */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-outline-variant bg-surface">
          <h3 className="border-b border-outline-variant p-4 font-semibold text-on-surface">Mouvements</h3>
          {wallet.entries.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">Aucun mouvement pour le moment.</p>
          ) : (
            <ul className="divide-y divide-outline-variant text-sm">
              {wallet.entries.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-on-surface">{ENTRY_LABELS[e.type]}{e.orderId ? ` · #CMD-${e.orderId}` : ""}</p>
                    <p className="text-xs text-on-surface-variant">{formatDateTime(e.createdAt)}</p>
                  </div>
                  <span className={`font-semibold ${e.amount < 0 ? "text-error" : "text-primary"}`}>
                    {e.amount > 0 ? "+" : ""}{formatPrice(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-outline-variant bg-surface">
          <h3 className="border-b border-outline-variant p-4 font-semibold text-on-surface">Mes retraits</h3>
          {payouts.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">Aucun retrait.</p>
          ) : (
            <ul className="divide-y divide-outline-variant text-sm">
              {payouts.slice(0, 10).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-on-surface">{formatPrice(p.amount)} MGA → {p.phone}</p>
                    <p className="text-xs text-on-surface-variant">
                      {formatDateTime(p.createdAt)} · frais {formatPrice(p.fees)} MGA
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-on-surface-variant">{PAYOUT_STATUS_LABELS[p.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
