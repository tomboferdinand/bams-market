"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, ImageOff, Check } from "lucide-react";
import type { Product } from "@/types/product";
import { addCartItem } from "@/services/cart.service";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/services/api";
import { useCart } from "@/features/cart/cart-context";


function formatPrice(price: number) {
    return new Intl.NumberFormat("fr-FR").format(price);
}

export function ProductCard({ product }: { product: Product }) {
    const router = useRouter();
    const { user } = useAuth();
     const { refreshCount } = useCart();
    const outOfStock = product.status === "RUPTURE_DE_STOCK";

    const [loading, setLoading] = useState(false);
    const [added, setAdded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleAddToCart(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            router.push("/connexion");
            return;
        }
        if (user.role !== "CLIENT") return; // le panier n'a de sens que pour un rôle CLIENT

        setLoading(true);
        setError(null);
        try {
            await addCartItem(product.id, 1);
            refreshCount();
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Erreur lors de l'ajout au panier.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <article className="group flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-sm transition-shadow hover:shadow-md">
            <Link href={`/produits/${product.id}`} className="relative block h-48 w-full overflow-hidden bg-surface-container">
                {product.imageUrl ? (
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className={`object-cover transition-transform duration-300 group-hover:scale-105 ${outOfStock ? "grayscale-[30%]" : ""}`}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-on-surface-variant">
                        <ImageOff size={28} />
                    </div>
                )}
                {outOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface/40 backdrop-blur-2xs">
                        <span className="rounded-full border border-error/20 bg-error-container px-3 py-1 text-xs font-semibold text-on-error-container">
                            Rupture de stock
                        </span>
                    </div>
                )}
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-4">
                <span className="flex items-center gap-1 truncate text-xs text-on-surface-variant">
                    {product.shop.name}
                </span>
                <Link href={`/produits/${product.id}`}>
                    <h3 className="line-clamp-2 font-bold text-on-surface hover:text-primary">{product.name}</h3>
                </Link>
                <div className="mt-auto flex items-center justify-between pt-2">
                    <span className={`text-lg font-bold ${outOfStock ? "text-on-surface-variant" : "text-primary"}`}>
                        {formatPrice(product.price)} <span className="text-sm font-normal">MGA</span>
                    </span>
                </div>

                {error && <p className="text-xs text-error">{error}</p>}

                <button
                    disabled={outOfStock || loading}
                    onClick={handleAddToCart}
                    title={outOfStock ? "Rupture de stock" : undefined}
                    className={`mt-2 flex h-11 w-full items-center justify-center gap-2 rounded text-sm font-semibold transition-colors ${outOfStock
                            ? "cursor-not-allowed border border-outline-variant bg-surface-variant text-on-surface-variant"
                            : added
                                ? "bg-tertiary-container text-on-tertiary-container"
                                : "bg-primary text-on-primary hover:bg-primary-container disabled:opacity-60"
                        }`}
                >
                    {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                    {outOfStock ? "Indisponible" : loading ? "Ajout..." : added ? "Ajouté !" : "Ajouter"}
                </button>
            </div>
        </article>
    );
}
