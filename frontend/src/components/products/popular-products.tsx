"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "./product-card";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { getCatalogue } from "@/services/products.service";
import type { Product } from "@/types/product";

export function PopularProducts() {
    const [products, setProducts] = useState<Product[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        getCatalogue()
            .then((data) => setProducts(data.slice(0, 4)))
            .catch(() => setError(true));
    }, []);

    if (error) return <ErrorState label="Impossible de charger les produits pour le moment." />;
    if (products === null) return <LoadingState label="Chargement des produits..." />;
    if (products.length === 0) return <EmptyState label="Aucun produit disponible pour le moment." />;

    return (
        <div className="grid grid-cols-2 gap-gutter md:grid-cols-4">
            {products.map((p) => (
                <ProductCard key={p.id} product={p} />
            ))}
        </div>
    );
}