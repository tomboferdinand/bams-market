"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Ban, CheckCircle2, Tag, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { CategoryModal } from "@/features/categories/components/category-modal";
import {
    getAdminCategories,
    deactivateCategory,
    reactivateCategory,
} from "@/services/categories.service";
import type { AdminCategory } from "@/types/category-admin";

export default function AdminCategoriesPage() {
    const { loading: authLoading } = useRequireRole(["ADMINISTRATEUR"]);
    const [categories, setCategories] = useState<AdminCategory[] | null>(null);
    const [error, setError] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AdminCategory | null>(null);

    function load() {
        getAdminCategories().then(setCategories).catch(() => setError(true));
    }

    useEffect(load, []);

    async function handleToggle(cat: AdminCategory) {
        const updated = cat.isActive ? await deactivateCategory(cat.id) : await reactivateCategory(cat.id);
        setCategories((prev) => prev!.map((c) => (c.id === updated.id ? updated : c)));
    }

    function handleSaved(saved: AdminCategory) {
        setCategories((prev) => {
            if (!prev) return [saved];
            const exists = prev.some((c) => c.id === saved.id);
            return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved];
        });
    }

    if (authLoading) return null;

    const total = categories?.length ?? 0;
    const activeCount = categories?.filter((c) => c.isActive).length ?? 0;
    const inactiveCount = total - activeCount;

    return (
        <DashboardShell title="Bam'S Market" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/categories">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-on-surface">Gestion des Catégories</h2>
                    <p className="mt-1 text-on-surface-variant">Gérez la structure du catalogue de Bam&apos;S Market.</p>
                </div>
                <button
                    onClick={() => { setEditing(null); setModalOpen(true); }}
                    className="flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-on-primary shadow-sm hover:bg-tertiary"
                >
                    <Plus size={20} /> Ajouter une catégorie
                </button>
            </div>

            {error && <ErrorState label="Impossible de charger les catégories." />}
            {!error && categories === null && <LoadingState label="Chargement..." />}

            {!error && categories !== null && (
                <>
                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Total Catégories</p>
                                    <h3 className="text-3xl font-bold text-on-surface">{total}</h3>
                                </div>
                                
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container">
                                    <Tag size={20} className="text-primary" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Catégories Actives</p>
                                    <h3 className="text-3xl font-bold text-on-surface">{activeCount}</h3>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container">
                                    <CheckCircle2 size={20} className="text-secondary" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="mb-1 text-xs uppercase tracking-wider text-on-surface-variant">Inactives</p>
                                    <h3 className="text-3xl font-bold text-on-surface">{inactiveCount}</h3>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-container">
                                    <XCircle size={20} className="text-error" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {categories.length === 0 ? (
                        <EmptyState label="Aucune catégorie créée pour le moment." />
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-outline-variant bg-surface-container-low">
                                            <th className="px-6 py-4 text-sm font-medium text-on-surface-variant">Nom de la Catégorie</th>
                                            <th className="px-6 py-4 text-center text-sm font-medium text-on-surface-variant">Produits Associés</th>
                                            <th className="px-6 py-4 text-center text-sm font-medium text-on-surface-variant">Statut</th>
                                            <th className="px-6 py-4 text-right text-sm font-medium text-on-surface-variant">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant">
                                        {categories.map((cat) => (
                                            <tr key={cat.id} className="hover:bg-surface-container">
                                                <td className="px-6 py-4">
                                                    <span className={`font-semibold text-on-surface ${!cat.isActive ? "text-on-surface-variant line-through" : ""}`}>
                                                        {cat.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-on-surface">{cat.productsCount}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {cat.isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container/20 px-3 py-1 text-xs font-semibold text-primary">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Actif
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-variant px-3 py-1 text-xs font-semibold text-on-surface-variant">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-outline" /> Inactif
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => { setEditing(cat); setModalOpen(true); }}
                                                            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                                                            title="Modifier"
                                                        >
                                                            <Edit size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggle(cat)}
                                                            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                                                            title={cat.isActive ? "Désactiver" : "Réactiver"}
                                                        >
                                                            {cat.isActive ? <Ban size={20} /> : <CheckCircle2 size={20} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            <CategoryModal
                open={modalOpen}
                category={editing}
                onClose={() => setModalOpen(false)}
                onSaved={handleSaved}
            />
        </DashboardShell>
    );
}