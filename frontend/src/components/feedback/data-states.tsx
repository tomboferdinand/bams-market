import { Loader2, PackageOpen, AlertCircle } from "lucide-react";

export function LoadingState({ label = "Chargement..." }: { label?: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm">{label}</p>
        </div>
    );
}

export function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-outline-variant py-16 text-on-surface-variant">
            <PackageOpen size={32} />
            <p className="text-sm">{label}</p>
        </div>
    );
}

export function ErrorState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-error/30 bg-error-container/20 py-16 text-on-error-container">
            <AlertCircle size={32} />
            <p className="text-sm">{label}</p>
        </div>
    );
}