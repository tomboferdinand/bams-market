import { CheckCircle2, Clock, Ban, EyeOff } from "lucide-react";
import type { ShopStatus } from "@/types/shop";

const CONFIG: Record<ShopStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
    VALIDEE: { label: "Boutique Validée", icon: CheckCircle2, className: "bg-primary-container/20 border-primary/30 text-primary" },
    EN_ATTENTE_VALIDATION: { label: "En attente de validation", icon: Clock, className: "bg-secondary-container/20 border-secondary-container/30 text-on-secondary-container" },
    SUSPENDUE: { label: "Boutique suspendue", icon: Ban, className: "bg-error-container/30 border-error/30 text-error" },
    INACTIVE: { label: "Boutique inactive", icon: EyeOff, className: "bg-surface-variant border-outline-variant text-on-surface-variant" },
};

export function ShopStatusBadge({ status }: { status: ShopStatus }) {
    const { label, icon: Icon, className } = CONFIG[status];
    return (
        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 ${className}`}>
            <Icon size={18} />
            <span className="text-sm font-semibold">{label}</span>
        </div>
    );
}