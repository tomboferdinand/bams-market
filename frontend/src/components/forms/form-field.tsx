import type { ReactNode } from "react";

interface FormFieldProps {
    label: string;
    htmlFor: string;
    error?: string;
    children: ReactNode;
}

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
    return (
        <div className="space-y-1">
            <label htmlFor={htmlFor} className="block text-xs font-medium text-on-surface">
                {label}
            </label>
            {children}
            {error && <p className="text-xs text-error">{error}</p>}
        </div>
    );
}