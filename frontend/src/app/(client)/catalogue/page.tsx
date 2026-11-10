"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { ProductCard } from "@/components/products/product-card";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { getCatalogue } from "@/services/products.service";
import { getActiveCategories } from "@/services/categories.service";
import type { Product, Category } from "@/types/product";

type SortOption = "recent" | "price_asc" | "price_desc";
const PAGE_SIZE = 12;

export default function CataloguePage() {
    const [products, setProducts] = useState<Product[] | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [error, setError] = useState(false);

    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState<number | "">("");
    const [sort, setSort] = useState<SortOption>("recent");
    const [page, setPage] = useState(1);

    useEffect(() => {
        getActiveCategories().then(setCategories).catch(() => { });
    }, []);

    useEffect(() => {
        setProducts(null);
        setError(false);
        const timeout = setTimeout(() => {
            getCatalogue({ search: search || undefined, categoryId: categoryId || undefined })
                .then((data) => {
                    setProducts(data);
                    setPage(1);
                })
                .catch(() => setError(true));
        }, 300); // debounce simple pour la recherche
        return () => clearTimeout(timeout);
    }, [search, categoryId]);

    const sorted = products
        ? [...products].sort((a, b) => {
            if (sort === "price_asc") return a.price - b.price;
            if (sort === "price_desc") return b.price - a.price;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        : [];

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-gutter px-4 py-8 md:flex-row md:px-8">
                {/* Sidebar filtres */}
                <aside className="flex w-full flex-shrink-0 flex-col gap-4 md:w-64">
                    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 shadow-sm">
                        <label className="mb-2 block text-sm font-semibold text-on-surface">Rechercher</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Nom du produit..."
                                className="w-full rounded-lg border border-outline-variant bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 shadow-sm">
                        <label className="mb-2 block text-sm font-semibold text-on-surface">Trier par</label>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as SortOption)}
                            className="w-full rounded border border-outline-variant bg-surface p-2 text-sm text-on-surface focus:border-primary focus:ring-primary"
                        >
                            <option value="recent">Nouveautés</option>
                            <option value="price_asc">Prix croissant</option>
                            <option value="price_desc">Prix décroissant</option>
                        </select>
                    </div>

                    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 shadow-sm">
                        <label className="mb-2 block text-sm font-semibold text-on-surface">Catégorie</label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                            className="w-full rounded border border-outline-variant bg-surface p-2 text-sm text-on-surface focus:border-primary focus:ring-primary"
                        >
                            <option value="">Toutes les catégories</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </aside>

                {/* Grille produits */}
                <section className="flex flex-1 flex-col gap-6">
                    <header className="flex items-end justify-between border-b border-outline-variant pb-2">
                        <h1 className="text-2xl font-bold text-on-background md:text-3xl">Catalogue Produits</h1>
                        {products && (
                            <span className="mb-1 text-sm text-on-surface-variant">
                                {sorted.length} résultat{sorted.length > 1 ? "s" : ""}
                            </span>
                        )}
                    </header>

                    {error && <ErrorState label="Impossible de charger le catalogue. Réessayez plus tard." />}
                    {!error && products === null && <LoadingState label="Chargement du catalogue..." />}
                    {!error && products !== null && sorted.length === 0 && (
                        <EmptyState label="Aucun produit ne correspond à votre recherche." />
                    )}

                    {!error && pageItems.length > 0 && (
                        <>
                            <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {pageItems.map((p) => (
                                    <ProductCard key={p.id} product={p} />
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-4 flex items-center justify-center gap-2 border-t border-outline-variant pt-6">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setPage(n)}
                                            className={`h-10 w-10 rounded font-semibold transition-colors ${n === page
                                                    ? "bg-primary text-on-primary shadow-sm"
                                                    : "border border-outline-variant text-on-surface hover:bg-surface-variant"
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
