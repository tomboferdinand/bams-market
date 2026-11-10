"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { approveRoleRequest, getAdminRoleRequests, rejectRoleRequest, resendActivationAsAdmin } from "@/services/admin-role-requests.service";
import { ApiError } from "@/services/api";
import {
  REQUESTED_ROLE_LABEL, ROLE_REQUEST_STATUS_CLASS, ROLE_REQUEST_STATUS_LABEL,
} from "@/features/role-requests/labels";
import { formatDateTime } from "@/lib/format";
import type { AdminRoleRequest } from "@/types/role-request";

const ALLOWED = ["ADMINISTRATEUR" as const];

export default function AdminRoleRequestsPage() {
  const { loading: authLoading } = useRequireRole(ALLOWED);
  const [status, setStatus] = useState("EN_ATTENTE");
  const [requests, setRequests] = useState<AdminRoleRequest[] | null>(null);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<AdminRoleRequest | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    setError(false);
    setRequests(null);
    getAdminRoleRequests(status || undefined).then(setRequests).catch(() => setError(true));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(r: AdminRoleRequest) {
    setBusyId(r.id);
    setActionError(null);
    setNotice(null);
    try {
      const res = await approveRoleRequest(r.id);
      setNotice(
        res.emailSent
          ? `Demande approuvée. Un lien d'activation a été envoyé à ${r.user.email}.`
          : "Demande approuvée, mais l'e-mail n'a pas pu partir : utilisez « Renvoyer le lien ».",
      );
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResend(r: AdminRoleRequest) {
    setBusyId(r.id);
    setActionError(null);
    setNotice(null);
    try {
      await resendActivationAsAdmin(r.id);
      setNotice(`Nouveau lien d'activation envoyé à ${r.user.email}.`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject() {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    setActionError(null);
    try {
      await rejectRoleRequest(rejecting.id, reason);
      setRejecting(null);
      setReason("");
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) return null;

  return (
    <DashboardShell title="Bam'S Market" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/demandes">
      <h1 className="text-2xl font-bold text-on-surface">Demandes de rôle</h1>
      <p className="mt-2 text-on-surface-variant">
        Clients qui souhaitent devenir commerçant ou livreur. L&apos;approbation envoie un lien d&apos;activation : le rôle change et le numéro de retrait est verrouillé quand le demandeur clique dessus.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrer par statut"
          className="rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm"
        >
          <option value="EN_ATTENTE">En attente</option>
          <option value="A_ACTIVER">Approuvées, à activer</option>
          <option value="APPROUVEE">Activées</option>
          <option value="REFUSEE">Refusées</option>
          <option value="ANNULEE">Annulées</option>
          <option value="">Toutes</option>
        </select>
      </div>

      {notice && (
        <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface" role="status">
          {notice}
        </div>
      )}
      {actionError && (
        <div className="mt-4 rounded-lg border border-error bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
          {actionError}
        </div>
      )}
      {error && <ErrorState label="Impossible de charger les demandes." />}
      {!error && requests === null && <LoadingState label="Chargement..." />}

      {requests && (
        <div className="mt-4 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
          {requests.length === 0 ? (
            <EmptyState label="Aucune demande." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface">
                    <th className="p-4 text-sm font-semibold text-on-surface-variant">Date</th>
                    <th className="p-4 text-sm font-semibold text-on-surface-variant">Demandeur</th>
                    <th className="p-4 text-sm font-semibold text-on-surface-variant">Rôle demandé</th>
                    <th className="p-4 text-sm font-semibold text-on-surface-variant">Numéro de retrait</th>
                    <th className="p-4 text-sm font-semibold text-on-surface-variant">Statut</th>
                    <th className="p-4 text-right text-sm font-semibold text-on-surface-variant">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {requests.map((r) => (
                    <tr key={r.id} className="align-top hover:bg-surface-container-low">
                      <td className="p-4 text-sm text-on-surface-variant">{formatDateTime(r.createdAt)}</td>
                      <td className="p-4 text-sm text-on-surface">
                        {r.user.firstName} {r.user.lastName}
                        <span className="block text-xs text-on-surface-variant">{r.user.email ?? "—"} · {r.user.phone ?? "—"}</span>
                        {r.message && <span className="mt-1 block max-w-xs text-xs italic text-on-surface-variant">« {r.message} »</span>}
                      </td>
                      <td className="p-4 text-sm text-on-surface">{REQUESTED_ROLE_LABEL[r.requestedRole]}</td>
                      <td className="p-4 text-sm text-on-surface-variant">{r.payoutPhone}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_REQUEST_STATUS_CLASS[r.status]}`}>
                          {ROLE_REQUEST_STATUS_LABEL[r.status]}
                        </span>
                        {r.rejectionReason && <span className="mt-1 block text-xs text-on-surface-variant">{r.rejectionReason}</span>}
                      </td>
                      <td className="p-4 text-right">
                        {r.status === "EN_ATTENTE" && (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => handleApprove(r)}
                              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60"
                            >
                              Approuver
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => { setRejecting(r); setReason(""); setActionError(null); }}
                              className="rounded-md border border-error px-3 py-1.5 text-sm font-semibold text-error hover:bg-error-container/10 disabled:opacity-60"
                            >
                              Refuser
                            </button>
                          </div>
                        )}
                        {r.status === "A_ACTIVER" && (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => handleResend(r)}
                            className="rounded-md border border-outline px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-60"
                          >
                            Renvoyer le lien
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejecting(null)} />
          <div role="dialog" aria-modal="true" aria-labelledby="reject-title" className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
            <h2 id="reject-title" className="text-lg font-bold text-on-surface">
              Refuser la demande de {rejecting.user.firstName} {rejecting.user.lastName}
            </h2>
            <label htmlFor="reject-reason" className="mt-4 block text-sm font-semibold text-on-surface">Motif du refus</label>
            <textarea
              id="reject-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ce motif sera envoyé au demandeur par e-mail."
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRejecting(null)} className="rounded-md px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container">
                Annuler
              </button>
              <button
                type="button"
                disabled={reason.trim().length < 5 || busyId === rejecting.id}
                onClick={handleReject}
                className="rounded-md bg-error px-4 py-2 text-sm font-semibold text-on-error disabled:opacity-60"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
