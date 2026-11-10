"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, PackageOpen, Truck, PartyPopper, Clock, XCircle, ImageOff, MapPin, CheckCircle, KeyRound } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getOrder, cancelOrder } from "@/services/orders.service";
import type { Order, OrderStatus } from "@/types/order";
import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";
import { reorderItems } from "@/features/orders/reorder";
import { failureKind } from "@/features/orders/failure-kind";
import { unpaidDeadline } from "@/features/orders/order-tabs";

// Adresse de contact de l'administration (optionnelle) : NEXT_PUBLIC_SUPPORT_EMAIL dans frontend/.env.local.
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

function fmt(n: number) {
    return new Intl.NumberFormat("fr-FR").format(n);
}

const STEPS: { status: OrderStatus; label: string; icon: typeof Clock }[] = [
    { status: "EN_ATTENTE_PAIEMENT", label: "En attente", icon: Clock },
    { status: "PAYEE", label: "Payée", icon: CheckCircle2 },
    { status: "EN_PREPARATION", label: "En préparation", icon: PackageOpen },
    { status: "EN_COURS_DE_LIVRAISON", label: "Livraison", icon: Truck },
    { status: "LIVREE", label: "Livrée", icon: PartyPopper },
];

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { refreshCount } = useCart();
    const id = Number(params.id);
    const [order, setOrder] = useState<Order | null>(null);
    const [error, setError] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [reorderMsg, setReorderMsg] = useState<string | null>(null);

    function load() {
        getOrder(id).then(setOrder).catch(() => setError(true));
    }
    useEffect(load, [id]);

    async function handleCancel() {
        const updated = await cancelOrder(id);
        setOrder(updated);
        setConfirmOpen(false);
    }

    async function handleReorder() {
        if (!order) return;
        setReorderMsg(null);
        const { added } = await reorderItems(order);
        refreshCount();
        if (added === 0) {
            setReorderMsg("Aucun article n'a pu être remis dans le panier (produits indisponibles).");
            return;
        }
        router.push("/panier");
    }

    const currentIndex = order ? STEPS.findIndex((s) => s.status === order.status) : -1;
    const failure = order ? failureKind(order) : null;
    const isTerminalIssue = failure !== null;

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />
            <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-8 md:px-8">
                {error && <ErrorState label="Impossible de charger cette commande." />}
                {!error && order === null && <LoadingState label="Chargement..." />}

                {order && (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-on-background md:text-3xl">Commande #{order.id}</h1>
                            <p className="mt-1 text-on-surface-variant">
                                Placée le {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                            <div className="mt-4 flex items-center gap-4">
                                <OrderStatusBadge status={order.status} />
                                {order.status === "EN_ATTENTE_PAIEMENT" && (
                                    <>
                                        <Link
                                            href={`/commande/${order.id}/paiement`}
                                            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container"
                                        >
                                            Procéder au paiement
                                        </Link>
                                        <button
                                            onClick={() => setConfirmOpen(true)}
                                            className="flex cursor-pointer items-center gap-2 rounded-md border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-container/10"
                                        >
                                            <XCircle size={18} /> Annuler la commande
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {order.status === "EN_ATTENTE_PAIEMENT" && (
                            <p className="mb-6 text-sm text-on-surface-variant">
                                À payer avant {unpaidDeadline(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} : passé ce délai, la commande est annulée automatiquement.
                            </p>
                        )}

                        {isTerminalIssue ? (
                            <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-error/30 bg-error-container/20 p-4 text-on-error-container">
                                <XCircle size={24} />
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold">
                                        {failure === "cancelled" && "Cette commande a été annulée."}
                                        {failure === "payment" && "Le paiement n'a pas abouti ou a expiré : la commande a été annulée automatiquement et le stock libéré."}
                                        {failure === "delivery" && "La livraison de cette commande n'a pas pu être effectuée."}
                                    </p>
                                    {failure === "delivery" && order.refund && (
                                        <p className="mt-1 text-sm">
                                            Vous avez été remboursé de {fmt(order.refund.amount)} MGA le{" "}
                                            {new Date(order.refund.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.
                                        </p>
                                    )}
                                    {failure === "delivery" && !order.refund && (
                                        <p className="mt-1 text-sm">
                                            Votre paiement a bien été reçu. Contactez l&apos;administration pour être remboursé, en indiquant uniquement le numéro de commande #{order.id} (le montant est connu du système).{" "}
                                            {SUPPORT_EMAIL && (
                                                <a
                                                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Remboursement commande #${order.id}`)}`}
                                                    className="font-semibold underline"
                                                >
                                                    Contacter l&apos;administration
                                                </a>
                                            )}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handleReorder}
                                    className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container"
                                >
                                    Commander à nouveau
                                </button>
                                {reorderMsg && <span className="text-sm">{reorderMsg}</span>}
                            </div>
                        ) : (
                            <div className="mb-8 rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm md:p-8">
                                <div className="flex flex-col justify-between gap-6 sm:flex-row">
                                    {STEPS.map((step, i) => {
                                        const reached = i <= currentIndex;
                                        const historyEntry = order.statusHistory.find((h) => h.status === step.status);
                                        const Icon = step.icon;
                                        return (
                                            <div key={step.status} className="flex flex-row items-center gap-3 sm:flex-col sm:text-center">
                                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${reached ? "bg-primary text-on-primary" : "bg-surface-variant text-on-surface-variant"}`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-semibold ${reached ? "text-primary" : "text-on-surface-variant"}`}>{step.label}</p>
                                                    {historyEntry && (
                                                        <p className="text-xs text-on-surface-variant">
                                                            {new Date(historyEntry.changedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
                            <div className="flex flex-col gap-gutter lg:col-span-8">
                                <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                                    <h3 className="mb-4 border-b border-outline-variant pb-2 text-lg font-bold text-on-surface">Produits commandés</h3>
                                    <div className="flex flex-col gap-4">
                                        {order.items.map((item) => (
                                            <div key={item.id} className="flex items-center gap-4">
                                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-outline-variant bg-surface-container">
                                                    {item.product.imageUrl ? (
                                                        <div className="relative h-full w-full"><Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" /></div>
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-on-surface-variant"><ImageOff size={18} /></div>
                                                    )}
                                                </div>
                                                <div className="flex-grow">
                                                    <h4 className="font-semibold text-on-surface">{item.product.name}</h4>
                                                    <p className="text-sm text-on-surface-variant">Quantité: {item.quantity}</p>
                                                </div>
                                                <p className="font-semibold text-primary">{fmt(item.unitPrice * item.quantity)} MGA</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-gutter lg:col-span-4">
                                <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                                    <h3 className="mb-4 border-b border-outline-variant pb-2 text-lg font-bold text-on-surface">Récapitulatif</h3>
                                    <div className="flex flex-col gap-3 text-sm">
                                        <div className="flex justify-between"><span className="text-on-surface-variant">Sous-total</span><span>{fmt(order.subtotal)} MGA</span></div>
                                        <div className="flex justify-between"><span className="text-on-surface-variant">Frais de livraison</span><span>{fmt(order.deliveryFee)} MGA</span></div>
                                        <div className="mt-1 flex justify-between border-t border-outline-variant pt-3 font-bold">
                                            <span>Total TTC</span>
                                            <span className="text-lg text-primary">{fmt(order.total)} MGA</span>
                                        </div>
                                    </div>
                                    {order.status !== "EN_ATTENTE_PAIEMENT" && order.status !== "ANNULEE" && order.status !== "ECHOUEE" && (
                                        <div className="mt-4 flex items-center gap-2 rounded-md bg-primary-container/10 p-3 text-primary">
                                            <CheckCircle size={20} /> <span className="text-sm font-semibold">Paiement confirmé</span>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                                    <h3 className="mb-4 flex items-center gap-2 border-b border-outline-variant pb-2 text-lg font-bold text-on-surface">
                                        <MapPin size={20} /> Adresse de livraison
                                    </h3>
                                    <p className="mb-1 font-semibold text-on-surface">{order.address.label}</p>
                                    <p className="text-on-surface-variant">{order.address.fullAddress}</p>
                                    <p className="mt-3 text-on-surface-variant">{order.address.phone}</p>
                                </div>

                                {order.status === "EN_COURS_DE_LIVRAISON" && order.confirmationCode && (
                                    <div className="rounded-lg border border-primary/30 bg-primary-container/10 p-6 shadow-sm">
                                        <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-on-surface">
                                            <KeyRound size={20} /> Code de livraison
                                        </h3>
                                        <p className="text-3xl font-bold tracking-[0.3em] text-primary">{order.confirmationCode}</p>
                                        <p className="mt-2 text-sm text-on-surface-variant">
                                            Communiquez ce code au livreur uniquement à la réception de votre colis.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>

            <ConfirmDialog
                open={confirmOpen}
                title="Confirmer l'annulation"
                description="Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible."
                confirmLabel="Confirmer l'annulation"
                onConfirm={handleCancel}
                onCancel={() => setConfirmOpen(false)}
            />
        </div>
    );
}