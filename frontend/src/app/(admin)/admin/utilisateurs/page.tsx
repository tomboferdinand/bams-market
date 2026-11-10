"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Ban, UserX, UserCheck, Phone } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/tables/pagination";
import { getAdminUsers, updateUserStatus } from "@/services/admin.service";
import { ApiError } from "@/services/api";
import { PayoutPhoneDialog } from "@/features/admin/components/payout-phone-dialog";
import { ROLE_LABEL, ACCOUNT_STATUS_LABEL } from "@/features/admin/labels";
import { formatDate, initials } from "@/lib/format";
import type { AdminUser } from "@/types/admin";
import type { AccountStatus, Role } from "@/types/auth";

const ROLE_BADGE: Record<Role, string> = {
  CLIENT: "bg-surface-variant text-on-surface-variant",
  COMMERCANT: "bg-secondary-fixed text-on-secondary-fixed",
  LIVREUR: "bg-surface-dim text-on-surface",
  ADMINISTRATEUR: "bg-tertiary-fixed text-on-tertiary-fixed",
};
const STATUS_BADGE: Record<AccountStatus, string> = {
  ACTIF: "bg-primary-fixed-dim text-on-primary-fixed",
  SUSPENDU: "bg-secondary-fixed text-secondary",
  DESACTIVE: "bg-error-container text-on-error-container",
};

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const { user: me, loading: authLoading } = useRequireRole(["ADMINISTRATEUR"]);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [phoneTarget, setPhoneTarget] = useState<AdminUser | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ user: AdminUser; status: AccountStatus } | null>(null);

  useEffect(() => {
    getAdminUsers().then(setUsers).catch(() => setError(true));
  }, []);

  const filtered = useMemo(
    () =>
      (users ?? []).filter((u) => {
        if (roleFilter && u.role !== roleFilter) return false;
        if (statusFilter && u.accountStatus !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const hay = `${u.firstName} ${u.lastName} ${u.email ?? ""} ${u.phone ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [users, roleFilter, statusFilter, search],
  );
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function applyStatus(user: AdminUser, status: AccountStatus) {
    setActionError(null);
    try {
      const updated = await updateUserStatus(user.id, status);
      setUsers((prev) => prev!.map((u) => (u.id === user.id ? updated : u)));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    }
  }

  function onPhoneSaved(userId: number, payoutPhone: string) {
    const changed = users?.find((u) => u.id === userId);
    setUsers((prev) => prev!.map((u) => (u.id === userId ? { ...u, payoutPhone } : u)));
    setPhoneTarget(null);
    setActionError(null);
    setNotice(`Numéro de retrait ${changed ? `de ${changed.firstName} ${changed.lastName} ` : ""}changé en ${payoutPhone}. Le titulaire a été prévenu par e-mail.`);
  }

  if (authLoading) return null;

  return (
    <DashboardShell title="Bam'S Market" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/utilisateurs">
      <h1 className="text-2xl font-bold text-on-surface md:text-3xl">Gestion des Utilisateurs</h1>
      <p className="mt-1 text-on-surface-variant">Gérez les accès et les statuts des comptes de la plateforme.</p>

      <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm md:flex-row">
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface"
          >
            <option value="">Tous les rôles</option>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface"
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(ACCOUNT_STATUS_LABEL) as AccountStatus[]).map((s) => <option key={s} value={s}>{ACCOUNT_STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Nom, e-mail ou téléphone..."
            className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {notice && <p role="status" className="mt-4 rounded-lg bg-surface-container-high p-3 text-sm text-on-surface">{notice}</p>}
      {actionError && <p className="mt-4 text-sm text-error">{actionError}</p>}
      {error && <ErrorState label="Impossible de charger les utilisateurs." />}
      {!error && users === null && <LoadingState label="Chargement..." />}
      {!error && users !== null && filtered.length === 0 && <div className="mt-4"><EmptyState label="Aucun utilisateur ne correspond." /></div>}

      {pageItems.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                  <th className="px-6 py-4 font-semibold">Utilisateur</th>
                  <th className="px-6 py-4 font-semibold">Rôle</th>
                  <th className="px-6 py-4 font-semibold">N° de retrait</th>
                  <th className="px-6 py-4 font-semibold">Inscription</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-sm">
                {pageItems.map((u) => {
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id} className="hover:bg-surface-container-low">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-on-primary-container">
                            {initials(u.firstName, u.lastName)}
                          </div>
                          <div>
                            <p className={`font-semibold text-on-surface ${u.accountStatus === "DESACTIVE" ? "line-through opacity-60" : ""}`}>
                              {u.firstName} {u.lastName} {isMe && <span className="text-xs font-normal text-on-surface-variant">(vous)</span>}
                            </p>
                            <p className="text-xs text-on-surface-variant">{u.email ?? u.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {u.role === "COMMERCANT" || u.role === "LIVREUR" ? (u.payoutPhone ?? "Non défini") : "—"}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[u.accountStatus]}`}>
                          {ACCOUNT_STATUS_LABEL[u.accountStatus]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {(u.role === "COMMERCANT" || u.role === "LIVREUR") && (
                            <button onClick={() => { setNotice(null); setPhoneTarget(u); }} title="Changer le numéro de retrait" aria-label="Changer le numéro de retrait"
                              className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface hover:text-primary">
                              <Phone size={18} />
                            </button>
                          )}
                          {isMe ? null : u.accountStatus === "ACTIF" ? (
                            <>
                              <button onClick={() => setTarget({ user: u, status: "SUSPENDU" })} title="Suspendre" aria-label="Suspendre"
                                className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface hover:text-secondary">
                                <Ban size={18} />
                              </button>
                              <button onClick={() => setTarget({ user: u, status: "DESACTIVE" })} title="Désactiver" aria-label="Désactiver"
                                className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface hover:text-error">
                                <UserX size={18} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => applyStatus(u, "ACTIF")} title="Réactiver" aria-label="Réactiver"
                              className="rounded-md p-1.5 text-primary hover:bg-surface">
                              <UserCheck size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} noun="utilisateurs" onChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        title={target?.status === "SUSPENDU" ? "Suspendre ce compte ?" : "Désactiver ce compte ?"}
        description="L'utilisateur ne pourra plus se connecter ni agir sur la plateforme tant qu'il n'est pas réactivé. Ses données et son historique sont conservés."
        confirmLabel={target?.status === "SUSPENDU" ? "Suspendre" : "Désactiver"}
        onConfirm={() => {
          if (target) applyStatus(target.user, target.status);
          setTarget(null);
        }}
        onCancel={() => setTarget(null)}
      />
      {phoneTarget && (
        <PayoutPhoneDialog key={phoneTarget.id} user={phoneTarget} onClose={() => setPhoneTarget(null)} onSaved={onPhoneSaved} />
      )}
    </DashboardShell>
  );
}