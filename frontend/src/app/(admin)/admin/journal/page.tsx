"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Store, UserCog, ShoppingCart, CreditCard, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { Pagination } from "@/components/tables/pagination";
import { getAuditLogs } from "@/services/admin.service";
import { ROLE_LABEL, labelForValue } from "@/features/admin/labels";
import { formatDateTime, initials } from "@/lib/format";
import type { AuditLogEntry } from "@/types/admin";

const ACTION_META: Record<string, { label: string; icon: LucideIcon }> = {
  SHOP_STATUS_CHANGE: { label: "Statut boutique", icon: Store },
  USER_STATUS_CHANGE: { label: "Statut compte", icon: UserCog },
  ORDER_STATUS_CHANGE: { label: "Statut commande", icon: ShoppingCart },
  PAYMENT_STATUS_CHANGE: { label: "Statut paiement", icon: CreditCard },
};
const ENTITY_LABEL: Record<string, string> = { Shop: "Boutique", User: "Utilisateur", Order: "Commande", Payment: "Paiement" };

const POSITIVE = ["VALIDEE", "ACTIF", "PAYEE", "LIVREE"];
const NEGATIVE = ["SUSPENDUE", "SUSPENDU", "DESACTIVE", "INACTIVE", "ANNULEE", "ECHOUEE", "EXPIREE"];
function tone(value: string | null) {
  if (value && POSITIVE.includes(value)) return "bg-primary-container text-on-primary-container";
  if (value && NEGATIVE.includes(value)) return "bg-error-container text-on-error-container";
  return "bg-surface-variant text-on-surface-variant";
}

function inPeriod(iso: string, period: string) {
  if (period === "all") return true;
  if (period === "today") return new Date(iso).toDateString() === new Date().toDateString();
  const days = period === "7d" ? 7 : 30;
  return Date.now() - new Date(iso).getTime() <= days * 86_400_000;
}

const PAGE_SIZE = 15;

export default function AdminJournalPage() {
  const { loading: authLoading } = useRequireRole(["ADMINISTRATEUR"]);
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [entityType, setEntityType] = useState("");
  const [period, setPeriod] = useState("7d");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLogs(null);
    setError(false);
    getAuditLogs(entityType || undefined).then(setLogs).catch(() => setError(true));
  }, [entityType]);

  const filtered = useMemo(
    () =>
      (logs ?? []).filter((l) => {
        if (!inPeriod(l.createdAt, period)) return false;
        if (search) {
          const q = search.toLowerCase();
          const actor = l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : "système";
          if (!`${actor} ${l.entityId} ${ENTITY_LABEL[l.entityType] ?? l.entityType}`.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [logs, period, search],
  );
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (authLoading) return null;

  return (
    <DashboardShell title="Bam'S Market" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/journal">
      <h1 className="text-2xl font-bold text-on-background md:text-3xl">Journal d&apos;activité</h1>
      <p className="mt-1 text-on-surface-variant">Traçabilité des changements de statut critiques (boutiques, comptes, commandes, paiements).</p>

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs text-on-surface-variant">Période</label>
          <select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
            className="h-10 w-full rounded-md border border-outline-variant bg-white px-3 text-sm">
            <option value="today">Aujourd&apos;hui</option>
            <option value="7d">Les 7 derniers jours</option>
            <option value="30d">Les 30 derniers jours</option>
            <option value="all">Tout</option>
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs text-on-surface-variant">Type d&apos;objet</label>
          <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="h-10 w-full rounded-md border border-outline-variant bg-white px-3 text-sm">
            <option value="">Tous</option>
            {Object.entries(ENTITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs text-on-surface-variant">Recherche</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Auteur, n° d'objet..."
              className="h-10 w-full rounded-md border border-outline-variant bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
        </div>
      </div>

      {error && <ErrorState label="Impossible de charger le journal." />}
      {!error && logs === null && <LoadingState label="Chargement..." />}
      {!error && logs !== null && filtered.length === 0 && <div className="mt-4"><EmptyState label="Aucune entrée pour ces critères." /></div>}

      {pageItems.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-sm font-semibold text-on-surface-variant">
                  <th className="px-6 py-3">Date &amp; heure</th>
                  <th className="px-6 py-3">Auteur</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Cible</th>
                  <th className="px-6 py-3">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-sm">
                {pageItems.map((l) => {
                  const meta = ACTION_META[l.action] ?? { label: l.action, icon: ScrollText };
                  return (
                    <tr key={l.id} className="hover:bg-surface-container-lowest">
                      <td className="whitespace-nowrap px-6 py-4 text-on-surface">{formatDateTime(l.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary-container text-xs font-bold text-on-secondary-container">
                            {l.actor ? initials(l.actor.firstName, l.actor.lastName) : "SY"}
                          </div>
                          <div>
                            <p className="text-on-surface">{l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : "Système"}</p>
                            {l.actor && <p className="text-xs text-on-surface-variant">{ROLE_LABEL[l.actor.role]}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${tone(l.newValue)}`}>
                          <meta.icon size={14} /> {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-on-surface">{ENTITY_LABEL[l.entityType] ?? l.entityType} #{l.entityId}</p>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {labelForValue(l.previousValue)} → <span className="font-semibold text-on-surface">{labelForValue(l.newValue)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} noun="entrées" onChange={setPage} />
        </div>
      )}
      {logs && logs.length >= 200 && (
        <p className="mt-3 text-xs text-on-surface-variant">Seules les 200 entrées les plus récentes sont chargées.</p>
      )}
    </DashboardShell>
  );
}