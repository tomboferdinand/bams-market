"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Clock, MailCheck, Store, Truck, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { VerificationBanner } from "@/components/layout/verification-banner";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { useAuth } from "@/features/auth/auth-context";
import { getCurrentUser } from "@/services/auth.service";
import { cancelRoleRequest, createRoleRequest, getMyRoleRequests, resendRoleActivation } from "@/services/role-requests.service";
import { ApiError } from "@/services/api";
import { ROLE_HOME } from "@/lib/routes";
import { roleRequestSchema, type RoleRequestFormValues } from "@/features/role-requests/schemas";
import { REQUESTED_ROLE_LABEL } from "@/features/role-requests/labels";
import { formatDateTime } from "@/lib/format";
import type { RoleRequest } from "@/types/role-request";

const ALLOWED = ["CLIENT" as const];

const OPTIONS = [
  { value: "COMMERCANT" as const, icon: Store, text: "Vendez vos produits à Fianarantsoa. Vous recevez le prix de vos ventes, moins la commission de la plateforme." },
  { value: "LIVREUR" as const, icon: Truck, text: "Livrez les commandes et recevez les frais de livraison à chaque course confirmée." },
];

export default function BecomePartnerPage() {
  const router = useRouter();
  const { loading: authLoading } = useRequireRole(ALLOWED);
  const { setUser } = useAuth();
  const [requests, setRequests] = useState<RoleRequest[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const {
    register, handleSubmit, watch, formState: { errors, isSubmitting },
  } = useForm<RoleRequestFormValues>({
    resolver: zodResolver(roleRequestSchema),
    defaultValues: { message: "" },
  });
  const selected = watch("requestedRole");

  const load = useCallback(() => {
    setLoadError(false);
    getMyRoleRequests().then(setRequests).catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const latest = requests?.[0] ?? null;
  const pending = latest?.status === "EN_ATTENTE" ? latest : null;
  const awaiting = latest?.status === "A_ACTIVER" ? latest : null;
  const approved = latest?.status === "APPROUVEE" ? latest : null;
  const rejected = latest?.status === "REFUSEE" ? latest : null;

  async function onSubmit(values: RoleRequestFormValues) {
    setServerError(null);
    try {
      await createRoleRequest({
        requestedRole: values.requestedRole,
        payoutPhone: values.payoutPhone,
        message: values.message?.trim() || undefined,
      });
      load();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.");
    }
  }

  async function handleResend() {
    if (!awaiting) return;
    setResending(true);
    setServerError(null);
    setResendNotice(null);
    try {
      await resendRoleActivation(awaiting.id);
      setResendNotice("E-mail envoyé. Pensez à vérifier vos courriers indésirables.");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.");
    } finally {
      setResending(false);
    }
  }

  async function handleCancel() {
    const target = pending ?? awaiting;
    if (!target) return;
    setCancelling(true);
    setServerError(null);
    try {
      await cancelRoleRequest(target.id);
      load();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.");
    } finally {
      setCancelling(false);
    }
  }

  // Après approbation, la session du navigateur ne connaît pas encore le nouveau rôle : on la recharge.
  async function goToSpace() {
    setRefreshing(true);
    const fresh = await getCurrentUser();
    if (fresh) {
      setUser(fresh);
      router.push(ROLE_HOME[fresh.role]);
    }
    setRefreshing(false);
  }

  if (authLoading) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <VerificationBanner />
      <main className="mx-auto w-full max-w-2xl flex-grow px-4 py-8 md:px-8">
        <Link href="/profil" className="text-sm text-on-surface-variant hover:text-primary hover:underline">
          ← Retour au profil
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-on-background md:text-3xl">Devenir partenaire</h1>
        <p className="mt-2 text-on-surface-variant">
          Déposez une demande : un administrateur l&apos;examine puis vous prévient par e-mail.
        </p>

        {loadError && <ErrorState label="Impossible de charger vos demandes." />}
        {!loadError && requests === null && <LoadingState label="Chargement..." />}

        {requests && approved && (
          <section className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm">
            <CheckCircle2 size={36} className="text-primary" />
            <h2 className="text-lg font-bold text-on-surface">Demande approuvée</h2>
            <p className="text-sm text-on-surface-variant">
              Vous êtes maintenant {REQUESTED_ROLE_LABEL[approved.requestedRole].toLowerCase()}.
            </p>
            <Button type="button" className="w-auto" loading={refreshing} onClick={goToSpace}>
              Accéder à mon espace
            </Button>
          </section>
        )}

        {requests && awaiting && (
          <section className="mt-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <MailCheck size={24} className="mt-0.5 text-primary" />
              <div>
                <h2 className="text-lg font-bold text-on-surface">Demande approuvée : activez votre espace</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Nous vous avons envoyé un e-mail avec un lien d&apos;activation (valable 7 jours). Votre compte devient{" "}
                  {REQUESTED_ROLE_LABEL[awaiting.requestedRole].toLowerCase()} dès que vous cliquez dessus.
                </p>
              </div>
            </div>
            {serverError && <p className="mt-4 text-sm text-error">{serverError}</p>}
            {resendNotice && <p className="mt-4 text-sm text-primary">{resendNotice}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" className="w-auto" loading={cancelling} onClick={handleCancel}>
                Annuler ma demande
              </Button>
              <Button type="button" className="w-auto" loading={resending} onClick={handleResend}>
                Renvoyer l&apos;e-mail d&apos;activation
              </Button>
            </div>
          </section>
        )}

        {requests && pending && (
          <section className="mt-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Clock size={24} className="mt-0.5 text-secondary" />
              <div>
                <h2 className="text-lg font-bold text-on-surface">Votre demande est en cours d&apos;examen</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {REQUESTED_ROLE_LABEL[pending.requestedRole]} · envoyée le {formatDateTime(pending.createdAt)}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">Numéro de retrait : {pending.payoutPhone}</p>
              </div>
            </div>
            {serverError && <p className="mt-4 text-sm text-error">{serverError}</p>}
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="ghost" className="w-auto border border-outline" loading={cancelling} onClick={handleCancel}>
                Annuler ma demande
              </Button>
            </div>
          </section>
        )}

        {requests && !pending && !awaiting && !approved && (
          <>
            {rejected && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-error bg-error-container p-4 text-on-error-container">
                <XCircle size={20} className="mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">Votre dernière demande n&apos;a pas été retenue.</p>
                  {rejected.rejectionReason && <p className="mt-1">Motif : {rejected.rejectionReason}</p>}
                  <p className="mt-1">Vous pouvez déposer une nouvelle demande ci-dessous.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-6" noValidate>
              {serverError && (
                <div className="rounded-lg border border-error bg-error-container px-4 py-3 text-sm text-on-error-container">
                  {serverError}
                </div>
              )}

              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-on-surface">Je souhaite devenir</legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {OPTIONS.map(({ value, icon: Icon, text }) => (
                    <label
                      key={value}
                      htmlFor={`role-${value}`}
                      className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors ${
                        selected === value ? "border-primary bg-primary-container/10" : "border-outline-variant hover:border-primary"
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold text-on-surface">
                        <input id={`role-${value}`} type="radio" value={value} className="accent-primary" {...register("requestedRole")} />
                        <Icon size={18} className="text-primary" />
                        {REQUESTED_ROLE_LABEL[value]}
                      </span>
                      <span className="text-sm text-on-surface-variant">{text}</span>
                    </label>
                  ))}
                </div>
                {errors.requestedRole && <p className="mt-2 text-xs text-error">{errors.requestedRole.message}</p>}
              </fieldset>

              <FormField label="Numéro Mobile Money de retrait" htmlFor="payoutPhone" error={errors.payoutPhone?.message}>
                <Input id="payoutPhone" type="tel" placeholder="034 00 000 00" error={!!errors.payoutPhone} {...register("payoutPhone")} />
                <p className="text-[11px] leading-tight text-on-surface-variant">
                  C&apos;est sur ce numéro (MVola, Orange Money ou Airtel Money) que vous recevrez votre argent. Il sera verrouillé à
                  l&apos;approbation ; seul un administrateur pourra le modifier.
                </p>
              </FormField>

              <div className="flex flex-col gap-1">
                <label htmlFor="message" className="text-sm font-semibold text-on-surface">Message (facultatif)</label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder="Présentez brièvement votre activité…"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("message")}
                />
                {errors.message && <p className="text-xs text-error">{errors.message.message}</p>}
              </div>

              <Button type="submit" loading={isSubmitting}>Envoyer ma demande</Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
