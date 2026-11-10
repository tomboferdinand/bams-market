"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Edit, EyeOff, Eye, ImageOff } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { COMMERCANT_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { ProductStatusBadge } from "@/features/products/components/product-status-badge";
import { getMyProducts, deactivateProduct, reactivateProduct } from "@/services/products.service";
import { getMyShop } from "@/services/shops.service";
import type { Product } from "@/types/product";

function formatPrice(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function ProductsListPage() {
  const { loading: authLoading } = useRequireRole(["COMMERCANT"]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState(false);
  const [shopValidated, setShopValidated] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    Promise.all([getMyProducts(), getMyShop()])
      .then(([prods, shop]) => {
        setProducts(prods);
        setShopValidated(shop?.status === "VALIDEE");
      })
      .catch(() => setError(true));
  }, []);

  async function handleToggle(product: Product) {
    const updated = product.isActive
      ? await deactivateProduct(product.id)
      : await reactivateProduct(product.id);
    setProducts((prev) => prev!.map((p) => (p.id === updated.id ? updated : p)));
  }

   const categories = Array.from(
   new Map((products ?? []).filter((p) => p.category).map((p) => [p.category.id, p.category])).values(),
 );

  const filtered = (products ?? []).filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && String(p.categoryId) !== categoryFilter) return false;
    if (statusFilter === "actif" && (!p.isActive || p.status !== "DISPONIBLE")) return false;
    if (statusFilter === "rupture" && p.status !== "RUPTURE_DE_STOCK") return false;
    if (statusFilter === "desactive" && p.isActive) return false;
    return true;
  });

  if (authLoading) return null;

  return (
    <DashboardShell title="Products" portalLabel="Merchant Portal" navItems={COMMERCANT_NAV} activeHref="/commercant/produits">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-on-background">Liste des Produits</h2>
          <p className="mt-1 text-on-surface-variant">Gérez votre catalogue de produits locaux.</p>
        </div>
        {shopValidated ? (
          <Link
            href="/commercant/produits/ajouter"
            className="flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container"
          >
            <Plus size={20} /> Ajouter un produit
          </Link>
        ) : (
          <span
            title="Votre boutique doit être validée par un administrateur avant d'ajouter des produits."
            className="flex h-11 cursor-not-allowed items-center gap-2 rounded-lg bg-surface-variant px-4 text-sm font-semibold text-on-surface-variant"
          >
            <Plus size={20} /> Ajouter un produit
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-col items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm lg:flex-row">
        <div className="relative w-full lg:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface"
          >
            <option value="">Tous</option>
            <option value="actif">Actifs</option>
            <option value="rupture">Rupture</option>
            <option value="desactive">Désactivés</option>
          </select>
        </div>
      </div>

      {error && <ErrorState label="Impossible de charger vos produits." />}
      {!error && products === null && <LoadingState label="Chargement..." />}
      {!error && products !== null && filtered.length === 0 && (
        <EmptyState label="Aucun produit ne correspond à votre recherche." />
      )}

      {!error && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant">Produit</th>
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant">Catégorie</th>
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant">Prix (MGA)</th>
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant">Stock</th>
                  <th className="px-6 py-4 text-xs font-medium text-on-surface-variant">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-on-surface-variant">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-sm">
                {filtered.map((p) => (
                  <tr key={p.id} className={`hover:bg-surface-container-low/50 ${!p.isActive ? "opacity-70" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-outline-variant/50 bg-surface-variant">
                          {p.imageUrl ? (
                            <div className="relative h-full w-full">
                              <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center text-on-surface-variant">
                              <ImageOff size={18} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className={`font-semibold text-on-surface ${!p.isActive ? "line-through decoration-outline" : ""}`}>{p.name}</p>
                          <p className="mt-0.5 text-xs text-on-surface-variant">Réf: #{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{p.category.name}</td>
                    <td className="px-6 py-4 font-semibold text-primary">{formatPrice(p.price)}</td>
                    <td className={`px-6 py-4 ${p.stock === 0 ? "font-medium text-error" : "text-on-surface"}`}>{p.stock}</td>
                    <td className="px-6 py-4"><ProductStatusBadge product={p} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/commercant/produits/${p.id}/modifier`}
                          className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-primary"
                          title="Modifier"
                        >
                          <Edit size={20} />
                        </Link>
                        <button
                          onClick={() => handleToggle(p)}
                          className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-primary"
                          title={p.isActive ? "Désactiver" : "Réactiver"}
                        >
                          {p.isActive ? <EyeOff size={20} /> : <Eye size={20} />}
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
    </DashboardShell>
  );
}
