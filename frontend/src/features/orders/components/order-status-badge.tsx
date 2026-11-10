import type { OrderStatus } from "@/types/order";

const CONFIG: Record<OrderStatus, { label: string; className: string }> = {
    EN_ATTENTE_PAIEMENT: { label: "En attente de paiement", className: "bg-surface-container-high text-on-surface" },
    PAYEE: { label: "Payée", className: "bg-primary-container/20 text-primary" },
    EN_PREPARATION: { label: "En préparation", className: "bg-surface-container-high text-on-surface" },
    EN_COURS_DE_LIVRAISON: { label: "En cours de livraison", className: "bg-secondary-container text-on-secondary-container" },
    LIVREE: { label: "Livrée", className: "bg-tertiary-container text-on-tertiary-container" },
    ANNULEE: { label: "Annulée", className: "bg-error-container text-on-error-container" },
    ECHOUEE: { label: "Échouée", className: "bg-error-container text-on-error-container" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
    const { label, className } = CONFIG[status];
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
            {label}
        </span>
    );
}