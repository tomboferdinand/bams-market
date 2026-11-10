"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { getOrders } from "@/services/orders.service";
import { failureKind } from "@/features/orders/failure-kind";
import { orderTab, unpaidDeadline, TAB_LABEL, type OrderTab } from "@/features/orders/order-tabs";
import type { Order } from "@/types/order";

const TABS: OrderTab[] = ["active", "done", "closed"];

function fmt(n: number) {
    return new Intl.NumberFormat("fr-FR").format(n);
}

function shortDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function hint(order: Order): string | null {
    if (order.status === "EN_ATTENTE_PAIEMENT") {
        const t = unpaidDeadline(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return `À payer avant ${t}, sinon la commande sera annulée automatiquement.`;
    }
    const f = failureKind(order);
    if (f === "delivery" && order.refund) return `Livraison impossible : vous avez été remboursé de ${fmt(order.refund.amount)} MGA.`;
    if (f === "delivery") return "Livraison impossible : contactez l'administration pour le remboursement.";
    if (f === "payment") return "Le paiement n'a pas abouti ou a expiré.";
    if (f === "cancelled") return "Commande annulée.";
    return null;
}

export default function MyOrdersPage() {
    const [orders, setOrders] = useState<Order[] | null>(null);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState<OrderTab>("active");

    useEffect(() => {
        getOrders().then(setOrders).catch(() => setError(true));
    }, []);

    const sorted = useMemo(
        () => [...(orders ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
        [orders],
    );
    const counts = useMemo(() => {
        const c: Record<OrderTab, number> = { active: 0, done: 0, closed: 0 };
        sorted.forEach((o) => { c[orderTab(o.status)]++; });
        return c;
    }, [sorted]);
    const shown = sorted.filter((o) => orderTab(o.status) === tab);

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />
            <main className="mx-auto w-full max-w-4xl flex-grow px-4 py-8 md:px-8">
                <h1 className="mb-6 text-2xl font-bold text-on-background md:text-3xl">Mes commandes</h1>

                {error && <ErrorState label="Impossible de charger vos commandes." />}
                {!error && orders === null && <LoadingState label="Chargement..." />}

                {orders && (
                    <>
                        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-outline-variant" role="tablist">
                            {TABS.map((t) => (
                                <button
                                    key={t}
                                    role="tab"
                                    aria-selected={tab === t}
                                    onClick={() => setTab(t)}
                                    className={`cursor-pointer whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                                        tab === t
                                            ? "border-primary text-primary"
                                            : "border-transparent text-on-surface-variant hover:text-on-background"
                                    }`}
                                >
                                    {TAB_LABEL[t]} ({counts[t]})
                                </button>
                            ))}
                        </div>

                        {shown.length === 0 ? (
                            <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-on-surface-variant">
                                <p>Aucune commande dans cet onglet.</p>
                                {orders.length === 0 && (
                                    <Link href="/" className="mt-3 inline-block font-semibold text-primary hover:underline">
                                        Découvrir les produits
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {shown.map((o) => {
                                    const h = hint(o);
                                    const unpaid = o.status === "EN_ATTENTE_PAIEMENT";
                                    return (
                                        <li key={o.id} className="rounded-xl border border-outline-variant bg-surface p-5 shadow-sm">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-bold text-on-background">Commande #{o.id}</p>
                                                    <p className="text-sm text-on-surface-variant">
                                                        {shortDate(o.createdAt)} · {o.items.length} article{o.items.length > 1 ? "s" : ""}
                                                    </p>
                                                </div>
                                                <OrderStatusBadge status={o.status} />
                                            </div>
                                            {h && <p className="mt-3 text-sm text-on-surface-variant">{h}</p>}
                                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                                <p className="text-lg font-bold text-primary">{fmt(o.total)} MGA</p>
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/commande/${o.id}`}
                                                        className="rounded-md border border-outline-variant px-4 py-2 text-sm font-semibold text-on-background hover:bg-surface-container-low"
                                                    >
                                                        {unpaid ? "Détails" : "Voir / suivre"}
                                                    </Link>
                                                    {unpaid && (
                                                        <Link
                                                            href={`/commande/${o.id}/paiement`}
                                                            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container"
                                                        >
                                                            Payer maintenant
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
