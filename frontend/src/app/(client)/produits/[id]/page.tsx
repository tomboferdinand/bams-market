"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getProductDetail } from "@/services/products.service";
import type { Product } from "@/types/product";
import { ShoppingCart, ImageOff, Minus, Plus, Store, Truck, ShieldCheck, Check } from "lucide-react";
import { addCartItem, clearCart } from "@/services/cart.service";
import { useAuth } from "@/features/auth/auth-context";
import { useCart } from "@/features/cart/cart-context";
import { ApiError } from "@/services/api";

function formatPrice(price: number) {
    return new Intl.NumberFormat("fr-FR").format(price);
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { refreshCount } = useCart();
    const id = Number(params.id);
    const [product, setProduct] = useState<Product | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [cartError, setCartError] = useState<string | null>(null);
    // Message du serveur quand le panier contient déjà les produits d'une autre boutique (BR-CMD-07).
    const [otherShopMessage, setOtherShopMessage] = useState<string | null>(null);

    useEffect(() => {
        getProductDetail(id)
            .then(setProduct)
            .catch(() => setError("Produit introuvable ou indisponible."));
    }, [id]);

    const outOfStock = product?.status === "RUPTURE_DE_STOCK";

    function showAdded() {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        refreshCount();
    }

    async function handleAddToCart() {
        if (!product) return;
        if (!user) {
            router.push("/connexion");
            return;
        }
        if (user.role !== "CLIENT") {
            setCartError("Seuls les comptes clients peuvent commander. Connectez-vous avec un compte client.");
            return;
        }

        setAdding(true);
        setCartError(null);
        try {
            await addCartItem(product.id, quantity);
            showAdded();
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                // Le panier n'est jamais vidé sans l'accord du client : on lui pose la question.
                setOtherShopMessage(err.message);
            } else {
                setCartError(err instanceof ApiError ? err.message : "Erreur lors de l'ajout au panier.");
            }
        } finally {
            setAdding(false);
        }
    }

    // Choix explicite du client : vider le panier actuel puis ajouter ce produit.
    async function handleReplaceCart() {
        if (!product) return;
        setAdding(true);
        setCartError(null);
        try {
            await clearCart();
            await addCartItem(product.id, quantity);
            setOtherShopMessage(null);
            showAdded();
        } catch (err) {
            setOtherShopMessage(null);
            setCartError(err instanceof ApiError ? err.message : "Erreur lors de l'ajout au panier.");
        } finally {
            setAdding(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />

            <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-8 md:px-8">
                {error && <ErrorState label={error} />}
                {!error && !product && <LoadingState label="Chargement du produit..." />}

                {product && (
                    <>
                        <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                            <Link href="/" className="hover:text-primary">Accueil</Link>
                            <span>/</span>
                            <Link href="/catalogue" className="hover:text-primary">Catalogue</Link>
                            <span>/</span>
                            <span className="font-semibold text-on-surface">{product.name}</span>
                        </nav>

                        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12 lg:gap-8">
                            {/* Image */}
                            <div className="relative h-87.5 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm md:h-125 lg:col-span-7">
                                {product.imageUrl ? (
                                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" priority />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-on-surface-variant">
                                        <ImageOff size={48} />
                                    </div>
                                )}
                            </div>

                            {/* Détails */}
                            <div className="flex flex-col lg:col-span-5">
                                <div className="mb-4">
                                    <span
                                        className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${outOfStock ? "bg-error-container text-on-error-container" : "bg-tertiary-container text-on-tertiary-container"
                                            }`}
                                    >
                                        {outOfStock ? "Rupture de stock" : "En Stock"}
                                    </span>
                                    <h1 className="mb-2 text-2xl font-bold text-on-surface md:text-3xl">{product.name}</h1>
                                    <span className="flex items-center gap-1 text-sm text-primary">
                                        <Store size={16} /> {product.shop.name}
                                    </span>
                                </div>

                                <div className="mb-6 border-b border-outline-variant pb-6">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-primary md:text-4xl">{formatPrice(product.price)}</span>
                                        <span className="text-lg font-bold text-primary">MGA</span>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="mb-2 text-sm font-semibold text-on-surface">Description du produit</h3>
                                    <p className="whitespace-pre-line text-sm text-on-surface-variant">{product.description}</p>
                                </div>

                                <div className="mt-auto rounded-xl border border-outline-variant/50 bg-surface-container-low p-4 shadow-sm">
                                    <div className="mb-4 flex items-end gap-4">
                                        <div className="w-1/3">
                                            <label className="mb-1 block text-xs font-semibold text-on-surface">Quantité</label>
                                            <div className="flex h-11 items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-2">
                                                <button
                                                    aria-label="Diminuer la quantité"
                                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                                    disabled={outOfStock}
                                                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-container disabled:opacity-40"
                                                >
                                                    <Minus size={18} />
                                                </button>
                                                <span className="w-8 text-center font-semibold">{quantity}</span>
                                                <button
                                                    aria-label="Augmenter la quantité"
                                                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                                                    disabled={outOfStock}
                                                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-container disabled:opacity-40"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="w-2/3 pb-3 text-right text-xs text-on-surface-variant">
                                            {!outOfStock && `${product.stock} en stock`}
                                        </div>
                                    </div>
                                    {cartError && <p className="mb-2 text-sm text-error">{cartError}</p>}
                                    <button
                                        disabled={outOfStock || adding}
                                        onClick={handleAddToCart}
                                        title={outOfStock ? "Rupture de stock" : undefined}
                                        className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${outOfStock
                                                ? "cursor-not-allowed bg-surface-variant text-on-surface-variant"
                                                : added
                                                    ? "bg-tertiary-container text-on-tertiary-container"
                                                    : "bg-primary text-on-primary hover:bg-primary-container disabled:opacity-60"
                                            }`}
                                    >
                                        {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                                        {outOfStock ? "Indisponible" : adding ? "Ajout..." : added ? "Ajouté au panier !" : "Ajouter au panier"}
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-col gap-2 rounded-lg border border-outline-variant/30 bg-surface-bright p-3 text-sm text-on-surface-variant">
                                    <div className="flex items-start gap-2">
                                        <Truck size={20} className="shrink-0 text-primary" />
                                        <span>Livraison locale (Fianarantsoa)</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <ShieldCheck size={20} className="shrink-0 text-primary" />
                                        <span>Produit vendu par une boutique validée Bam&apos;S Market.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            <ConfirmDialog
                open={otherShopMessage !== null}
                title="Produits d'une autre boutique"
                description={`${otherShopMessage ?? ""} Voulez-vous vider votre panier pour ajouter ce produit ?`}
                confirmLabel="Vider le panier et ajouter"
                onConfirm={handleReplaceCart}
                onCancel={() => setOtherShopMessage(null)}
            />
        </div>
    );
}
