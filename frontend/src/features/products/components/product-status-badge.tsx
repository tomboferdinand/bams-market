import type { Product } from "@/types/product";

export function ProductStatusBadge({ product }: { product: Product }) {
    if (!product.isActive) {
        return (
            <span className="inline-flex items-center rounded-full bg-surface-variant px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
                Désactivé
            </span>
        );
    }
    if (product.status === "RUPTURE_DE_STOCK") {
        return (
            <span className="inline-flex items-center rounded-full bg-error-container/50 px-2.5 py-1 text-[11px] font-semibold text-error">
                Rupture
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-full bg-primary-container/20 px-2.5 py-1 text-[11px] font-semibold text-tertiary">
            Actif
        </span>
    );
}