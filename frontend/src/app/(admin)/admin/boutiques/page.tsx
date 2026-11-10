"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, Eye, CheckCircle2, Ban, RotateCcw, XCircle, MapPin, Phone, Mail, User, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/tables/pagination";
import { getAllShopsForAdmin, updateShopStatus } from "@/services/shops.service";
import { ApiError } from "@/services/api";
import { SHOP_STATUS_LABEL } from "@/features/admin/labels";
import { formatDate } from "@/lib/format";
import type { AdminShop } from "@/types/admin";
import type { ShopStatus } from "@/types/shop";

const STATUS_CLASS: Record<ShopStatus, string> = {
  EN_ATTENTE_VALIDATION: "bg-secondary-fixed text-on-secondary-fixed",
  VALIDEE: "bg-primary-fixed-dim text-on-primary-fixed",
  SUSPENDUE: "bg-error-container text-on-error-container",
  INACTIVE: "bg-surface-variant text-on-surface-variant",
};

const TABS: { label: string; value: ShopStatus | "" }[] = [
  { label: "En attente", value: "EN_ATTENTE_VALIDATION" },
  { label: "Validées", value: "VALIDEE" },
  { label: "Suspendues", value: "SUSPENDUE" },
  { label: "Inactives", value: "INACTIVE" },
  { label: "Toutes", value: "" },
];

interface ShopAction {
  label: string;
  status: ShopStatus;
  icon: LucideIcon;
  danger?: boolean;
  confirmText?: string;
}

function actionsFor(status: ShopStatus): ShopAction[] {
  switch (status) {
    case "EN_ATTENTE_VALIDATION":
      return [
        { label: "Valider", status: "VALIDEE", icon: CheckCircle2 },
        { label: "Refuser", status: "INACTIVE", icon: XCircle, danger: true, confirmText: "La boutique passera au statut « Inactive » et ne pourra pas vendre." },
      ];
    case "VALIDEE":
      return [{ label: "Suspendre", status: "SUSPENDUE", icon: Ban, danger: true, confirmText: "Tous ses produits seront immédiatement retirés du catalogue public." }];
    case "SUSPENDUE":
      return [{ label: "Réactiver", status: "VALIDEE", icon: RotateCcw }];
    case "INACTIVE":
      return [{ label: "Valider", status: "VALIDEE", icon: CheckCircle2 }];
  }
}

const PAGE_SIZE = 10;

export default function AdminShopsPage() {
  const { loading: authLoading } = useRequireRole(["ADMINISTRATEUR"]);
  const [shops, setShops] = useState<AdminShop[] | null>(null);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<ShopStatus | "">("EN_ATTENTE_VALIDATION");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<AdminShop | null>(null);
  const [confirm, setConfirm] = useState<{ shop: AdminShop; action: ShopAction } | null>(null);

  useEffect(() => {
    getAllShopsForAdmin().then(setShops).catch(() => setError(true));
  }, []);

  const counts = useMemo(() => {
    const c: Record<ShopStatus, number> = { EN_ATTENTE_VALIDATION: 0, VALIDEE: 0, SUSPENDUE: 0, INACTIVE: 0 };
    (shops ?? []).forEach((s) => (c[s.status] += 1));
    return c;
  }, [shops]);

  const filtered = useMemo(
    () =>
      (shops ?? []).filter((s) => {
        if (tab && s.status !== tab) return false;
        if (search) {
          const q = search.toLowerCase();
          const owner = `${s.owner.firstName} ${s.owner.lastName}`.toLowerCase();
          if (!(s.name.toLowerCase().includes(q) || owner.includes(q))) return false;
        }
        return true;
      }),
    [shops, tab, search],
  );

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function applyStatus(shop: AdminShop, status: ShopStatus) {
    setActionError(null);
    try {
      const updated = await updateShopStatus(shop.id, status);
      setShops((prev) => prev!.map((s) => (s.id === shop.id ? { ...s, status: updated.status } : s)));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    }
  }

  function handleAction(shop: AdminShop, action: ShopAction) {
    if (action.danger) setConfirm({ shop, action });
    else applyStatus(shop, action.status);
  }

  if (authLoading) return null;

  const STATS = [
    { label: "En attente", value: counts.EN_ATTENTE_VALIDATION, className: "text-secondary" },
    { label: "Validées", value: counts.VALIDEE, className: "text-primary" },
    { label: "Suspendues", value: counts.SUSPENDUE, className: "text-error" },
    { label: "Inactives", value: counts.INACTIVE, className: "text-on-surface-variant" },
  ];

  return (
    <DashboardShell title="Bam'S Market" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/boutiques">
      <h1 className="text-2xl font-bold text-on-surface md:text-3xl">Validation des Boutiques</h1>
      <p className="mt-1 text-on-surface-variant">Examinez et approuvez les demandes d&apos;ouverture de boutique.</p>

      {error && <ErrorState label="Impossible de charger les boutiques." />}
      {!error && shops === null && <LoadingState label="Chargement..." />}

      {shops && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
                <p className={`text-sm font-semibold ${s.className}`}>{s.label}</p>
                <p className="mt-1 text-3xl font-bold text-on-surface">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TABS.map((t) => (
                <button
                  key={t.label}
                  onClick={() => { setTab(t.value); setPage(1); }}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    tab === t.value
                      ? "border-primary-container bg-primary-container text-on-primary-container"
                      : "border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Boutique ou commerçant..."
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {actionError && <p className="mt-4 text-sm text-error">{actionError}</p>}

          {filtered.length === 0 ? (
            <div className="mt-6"><EmptyState label="Aucune boutique dans cette catégorie." /></div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                      <th className="px-6 py-4 font-medium">Boutique &amp; Commerçant</th>
                      <th className="px-6 py-4 font-medium">Adresse</th>
                      <th className="px-6 py-4 font-medium">Date de demande</th>
                      <th className="px-6 py-4 font-medium">Statut</th>
                      <th className="px-6 py-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {pageItems.map((shop) => (
                      <tr key={shop.id} className="hover:bg-surface-container-low">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-variant">
                              {shop.logoUrl ? (
                                <Image src={shop.logoUrl} alt={shop.name} fill sizes="40px" className="object-cover" />
                              ) : (
                                <span className="flex h-full items-center justify-center font-bold text-primary">
                                  {shop.name[0]?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-on-surface">{shop.name}</p>
                              <p className="text-sm text-on-surface-variant">{shop.owner.firstName} {shop.owner.lastName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-on-surface">
                          <span className="flex items-center gap-1"><MapPin size={14} className="text-on-surface-variant" /> {shop.address}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDate(shop.createdAt)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[shop.status]}`}>
                            {SHOP_STATUS_LABEL[shop.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetails(shop)}
                              title="Voir les détails"
                              aria-label="Voir les détails"
                              className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-highest hover:text-primary"
                            >
                              <Eye size={18} />
                            </button>
                            {actionsFor(shop.status).map((a) => (
                              <button
                                key={a.label}
                                onClick={() => handleAction(shop, a)}
                                title={a.label}
                                aria-label={a.label}
                                className={`rounded-full p-2 ${
                                  a.danger ? "text-error hover:bg-error-container" : "text-primary hover:bg-surface-container-highest"
                                }`}
                              >
                                <a.icon size={18} />
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} noun="boutiques" onChange={setPage} />
            </div>
          )}
        </>
      )}

      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface p-6">
              <h3 className="text-lg font-bold text-on-surface">{details.name}</h3>
              <button onClick={() => setDetails(null)} className="rounded-full p-1 text-on-surface-variant hover:text-error">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 p-6 text-sm">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-variant">
                  {details.logoUrl && <Image src={details.logoUrl} alt={details.name} fill sizes="80px" className="object-cover" />}
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[details.status]}`}>
                  {SHOP_STATUS_LABEL[details.status]}
                </span>
              </div>
              <p className="text-on-surface-variant">{details.description}</p>
              <div className="space-y-2 text-on-surface">
                <p className="flex items-center gap-2"><MapPin size={16} className="text-on-surface-variant" /> {details.address}</p>
                <p className="flex items-center gap-2"><Phone size={16} className="text-on-surface-variant" /> {details.contactPhone}</p>
                <p className="flex items-center gap-2"><User size={16} className="text-on-surface-variant" /> {details.owner.firstName} {details.owner.lastName}</p>
                {details.owner.email && <p className="flex items-center gap-2"><Mail size={16} className="text-on-surface-variant" /> {details.owner.email}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm ? `${confirm.action.label} cette boutique ?` : ""}
        description={confirm?.action.confirmText ?? ""}
        confirmLabel={confirm?.action.label ?? ""}
        onConfirm={() => {
          if (confirm) applyStatus(confirm.shop, confirm.action.status);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </DashboardShell>
  );
}