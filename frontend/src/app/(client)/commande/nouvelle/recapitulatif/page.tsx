"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { MapPin, ShoppingBag, Edit, ShieldCheck, ImageOff } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { VerificationBanner } from "@/components/layout/verification-banner";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { getCart } from "@/services/cart.service";
import { getAddresses } from "@/services/addresses.service";
import { createOrder } from "@/services/orders.service";
import { ApiError } from "@/services/api";
import type { Cart } from "@/types/cart";
import type { Address } from "@/types/address";
import { useCart } from "@/features/cart/cart-context";

function fmt(n: number) {
    return new Intl.NumberFormat("fr-FR").format(n);
}

function CheckoutRecapContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshCount } = useCart();
    const addressId = Number(searchParams.get("addressId"));

    const [cart, setCart] = useState<Cart | null>(null);
    const [address, setAddress] = useState<Address | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (!addressId) {
            setError("Adresse manquante.");
            return;
        }
        Promise.all([getCart(), getAddresses()])
            .then(([cartData, addresses]) => {
                setCart(cartData);
                const found = addresses.find((a) => a.id === addressId);
                if (!found) throw new Error();
                setAddress(found);
            })
            .catch(() => setError("Impossible de charger le récapitulatif."));
    }, [addressId]);

    async function handleConfirm() {
        setConfirming(true);
        setError(null);
        try {
            const order = await createOrder(addressId);
            refreshCount();
            router.push(`/commande/${order.id}/paiement`);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
            setConfirming(false);
        }
    }

    const belowMinimum = cart ? !cart.meetsMinimum : false;

    return (
        <div className="flex min-h-screen flex-col bg-surface">
            <SiteHeader />
            <VerificationBanner />
            <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-8 md:px-8">
                <h1 className="text-2xl font-bold text-on-surface md:text-3xl">Récapitulatif de commande</h1>
                <p className="mt-1 text-on-surface-variant">Vérifiez vos informations avant de confirmer.</p>

                {error && <ErrorState label={error} />}
                {!error && (cart === null || address === null) && <LoadingState label="Chargement..." />}

                {cart && address && (
                    <div className="mt-8 grid grid-cols-1 gap-gutter lg:grid-cols-12">
                        <div className="flex flex-col gap-4 lg:col-span-8">
                            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={20} className="text-primary" />
                                        <h2 className="text-lg font-bold text-on-surface">Adresse de livraison</h2>
                                    </div>
                                    <button onClick={() => router.push("/commande/nouvelle/adresse")} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                                        <Edit size={16} /> Modifier
                                    </button>
                                </div>
                                <div className="ml-8 space-y-1 text-sm text-on-surface-variant">
                                    <p className="font-semibold text-on-surface">{address.label}</p>
                                    <p>{address.fullAddress}</p>
                                    <p>{address.city}</p>
                                    <p className="mt-2 text-on-surface">{address.phone}</p>
                                </div>
                            </section>

                            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                                <div className="mb-4 flex items-center gap-2">
                                    <ShoppingBag size={20} className="text-primary" />
                                    <h2 className="text-lg font-bold text-on-surface">Articles ({cart.items.length})</h2>
                                </div>
                                <div className="flex flex-col">
                                    {cart.items.map((item) => (
                                        <div key={item.id} className="flex items-start gap-4 border-b border-outline-variant py-4 last:border-0 last:pb-0">
                                            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-variant">
                                                {item.product.imageUrl ? (
                                                    <div className="relative h-full w-full"><Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" /></div>
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-on-surface-variant"><ImageOff size={18} /></div>
                                                )}
                                            </div>
                                            <div className="flex h-20 flex-grow flex-col justify-between">
                                                <h3 className="line-clamp-1 font-semibold text-on-surface">{item.product.name}</h3>
                                                <span className="w-max rounded bg-surface-container px-2 py-1 text-xs text-on-surface-variant">Qté: {item.quantity}</span>
                                            </div>
                                            <div className="whitespace-nowrap text-right font-semibold text-on-surface">{fmt(item.lineTotal)} MGA</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="lg:col-span-4">
                            <div className="sticky top-24 flex flex-col gap-4">
                                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                                    <h2 className="mb-6 border-b border-outline-variant pb-4 text-lg font-bold text-on-surface">Détail des prix</h2>
                                    <div className="mb-6 flex flex-col gap-3 text-sm text-on-surface-variant">
                                        <div className="flex justify-between"><span>Sous-total</span><span className="font-semibold text-on-surface">{fmt(cart.subtotal)} MGA</span></div>
                                        <div className="flex justify-between"><span>Frais de livraison</span><span className="font-semibold text-on-surface">{fmt(cart.deliveryFee)} MGA</span></div>
                                        <div className="flex justify-between border-t border-outline-variant pt-3 text-base font-bold text-on-surface">
                                            <span>Total à payer</span>
                                            <span className="text-primary">{fmt(cart.total)} MGA</span>
                                        </div>
                                    </div>

                                    {belowMinimum && (
                                        <p className="mb-4 rounded bg-error-container/30 p-3 text-sm text-error">
                                            Montant minimum de commande : {fmt(cart.minOrderAmount)} MGA.
                                        </p>
                                    )}

                                    <button
                                        disabled={confirming || belowMinimum}
                                        onClick={handleConfirm}
                                        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-60"
                                    >
                                        {confirming ? "Redirection..." : "Confirmer et procéder au paiement"}
                                    </button>
                                </div>

                                <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                                    <div className="flex items-center gap-3 text-on-surface-variant">
                                        <ShieldCheck size={20} className="text-primary" />
                                        <div>
                                            <p className="text-sm font-semibold text-on-surface">Commande sécurisée</p>
                                            <p className="text-xs">Montants calculés et vérifiés par le serveur.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function CheckoutRecapPage() {
    return (
        <Suspense fallback={<LoadingState label="Chargement..." />}>
            <CheckoutRecapContent />
        </Suspense>
    );
}
