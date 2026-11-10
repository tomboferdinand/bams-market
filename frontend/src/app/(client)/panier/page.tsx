"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/layout/site-header";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getCart, updateCartItem, removeCartItem, clearCart } from "@/services/cart.service";
import { ApiError } from "@/services/api";
import type { Cart } from "@/types/cart";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, ImageOff, ShoppingCart } from "lucide-react";
import { useCart } from "@/features/cart/cart-context";

function fmt(n: number) {
    return new Intl.NumberFormat("fr-FR").format(n);
}

export default function PanierPage() {
    const router = useRouter();
    const { refreshCount } = useCart();
    const [cart, setCart] = useState<Cart | null>(null);
    const [error, setError] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);

    useEffect(() => {
        getCart().then(setCart).catch(() => setError(true));
    }, []);

    async function run(action: () => Promise<Cart>) {
        setActionError(null);
        try {
            const updated = await action();
            setCart(updated);
            refreshCount();
        } catch (err) {
            setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
        }
    }

    async function handleQuantity(productId: number, quantity: number) {
        if (quantity < 1) return;
        await run(() => updateCartItem(productId, quantity));
    }

    async function handleRemove(productId: number) {
        await run(() => removeCartItem(productId));
    }

    async function handleClear() {
        await run(() => clearCart());
        setConfirmClearOpen(false);
    }

    const hasUnavailable = cart?.items.some((i) => !i.available) ?? false;
    const belowMinimum = cart ? !cart.meetsMinimum : false;
    const cannotOrder = hasUnavailable || belowMinimum;

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />
            <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-8 md:px-8">
                <h1 className="text-2xl font-bold text-on-background md:text-3xl">Mon Panier</h1>
                <p className="mt-2 text-on-surface-variant">Vérifiez vos articles avant de passer commande.</p>

                {error && <ErrorState label="Impossible de charger votre panier." />}
                {!error && cart === null && <LoadingState label="Chargement du panier..." />}
                {actionError && <p className="mt-4 text-sm font-semibold text-error">{actionError}</p>}

                {cart && cart.items.length === 0 && (
                    <div className="mt-8 flex flex-col items-center rounded-lg border border-outline-variant bg-surface py-16 text-center">
                        <ShoppingCart size={56} className="mb-4 text-outline-variant" />
                        <h2 className="mb-2 text-xl font-bold text-on-background">Votre panier est vide</h2>
                        <p className="mb-6 max-w-md text-on-surface-variant">
                            Découvrez nos produits frais et locaux pour remplir votre panier de bonnes choses de Fianarantsoa.
                        </p>
                        <Link href="/catalogue" className="rounded border border-primary px-6 py-2 font-semibold text-primary hover:bg-surface-container">
                            Continuer les achats
                        </Link>
                    </div>
                )}

                {cart && cart.items.length > 0 && (
                    <div className="mt-8 flex flex-col gap-gutter lg:flex-row">
                        <div className="flex-grow lg:w-2/3">
                            <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-sm">
                                {cart.items.map((item) => (
                                    <div key={item.id} className="flex flex-col gap-4 border-b border-outline-variant p-4 last:border-0 sm:flex-row sm:items-center">
                                        <div className="flex flex-1 items-center gap-4">
                                            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-surface-container">
                                                {item.product.imageUrl ? (
                                                    <div className="relative h-full w-full">
                                                        <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-on-surface-variant"><ImageOff size={20} /></div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-on-background">{item.product.name}</h3>
                                                <p className="mt-1 text-sm text-on-surface-variant">{item.product.category?.name ?? "—"}</p>
                                                {!item.available && (
                                                    <p className="mt-1 text-xs font-semibold text-error">Stock insuffisant ou produit indisponible</p>
                                                )}
                                                <button onClick={() => handleRemove(item.productId)} className="mt-2 flex items-center gap-1 text-sm text-error hover:underline">
                                                    <Trash2 size={16} /> Supprimer
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-6 sm:justify-end">
                                            <span className="text-sm text-on-surface-variant sm:hidden">Prix: {fmt(item.product.price)} MGA</span>
                                            <div className="flex h-8 items-center rounded border border-outline-variant">
                                                <button
                                                    aria-label={`Diminuer la quantité de ${item.product.name}`}
                                                    onClick={() => handleQuantity(item.productId, item.quantity - 1)}
                                                    className="flex h-full w-8 items-center justify-center hover:bg-surface-container-low"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="w-8 border-x border-outline-variant text-center text-sm">{item.quantity}</span>
                                                <button
                                                    aria-label={`Augmenter la quantité de ${item.product.name}`}
                                                    onClick={() => handleQuantity(item.productId, item.quantity + 1)}
                                                    className="flex h-full w-8 items-center justify-center hover:bg-surface-container-low"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                            <span className="font-semibold text-primary">{fmt(item.lineTotal)} MGA</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between bg-surface-container-lowest p-4">
                                    <Link href="/catalogue" className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary">
                                        <ArrowLeft size={18} /> Continuer les achats
                                    </Link>
                                    <button onClick={() => setConfirmClearOpen(true)} className="text-sm text-on-surface-variant hover:text-error">
                                        Vider le panier
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:w-1/3">
                            <div className="sticky top-24 rounded-lg border border-outline-variant bg-surface p-6 shadow-sm">
                                <h2 className="mb-6 text-lg font-bold text-on-background">Résumé de la commande</h2>
                                <div className="mb-6 space-y-3">
                                    <div className="flex justify-between text-on-surface-variant">
                                        <span>Sous-total ({cart.items.length} article{cart.items.length > 1 ? "s" : ""})</span>
                                        <span className="text-on-background">{fmt(cart.subtotal)} MGA</span>
                                    </div>
                                    <div className="flex justify-between text-on-surface-variant">
                                        <span>Frais de livraison</span>
                                        <span className="text-on-background">{fmt(cart.deliveryFee)} MGA</span>
                                    </div>
                                    <div className="flex justify-between border-t border-outline-variant pt-3 font-bold text-on-background">
                                        <span>Total à payer</span>
                                        <span className="text-primary">{fmt(cart.total)} MGA</span>
                                    </div>
                                </div>
                                {belowMinimum && (
                                    <p className="mb-4 rounded bg-error-container/30 p-3 text-sm text-error">
                                        Montant minimum de commande : {fmt(cart.minOrderAmount)} MGA. Il vous manque {fmt(cart.minOrderAmount - cart.subtotal)} MGA.
                                    </p>
                                )}
                                <button
                                    disabled={cannotOrder}
                                    onClick={() => router.push("/commande/nouvelle/adresse")}
                                    title={
                                        hasUnavailable
                                            ? "Retirez les articles indisponibles avant de continuer"
                                            : belowMinimum
                                                ? "Montant minimum de commande non atteint"
                                                : undefined
                                    }
                                    className={`mb-4 flex h-11 w-full items-center justify-center gap-2 rounded font-semibold shadow-sm transition-colors ${cannotOrder ? "cursor-not-allowed bg-surface-variant text-on-surface-variant" : "bg-primary text-on-primary hover:bg-primary-container"
                                        }`}
                                >
                                    <ShoppingBag size={20} /> Passer commande
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <ConfirmDialog
                open={confirmClearOpen}
                title="Vider le panier ?"
                description="Tous les articles seront retirés de votre panier."
                confirmLabel="Vider"
                onConfirm={handleClear}
                onCancel={() => setConfirmClearOpen(false)}
            />
        </div>
    );
}
