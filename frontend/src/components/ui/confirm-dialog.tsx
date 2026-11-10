"use client";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-sm rounded-xl bg-surface-container-lowest p-6 shadow-xl">
                <h3 className="mb-2 text-lg font-bold text-on-surface">{title}</h3>
                <p className="mb-6 text-sm text-on-surface-variant">{description}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high">
                        Annuler
                    </button>
                    <button onClick={onConfirm} className="rounded-lg bg-error px-4 py-2 text-sm text-on-error hover:opacity-90">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}