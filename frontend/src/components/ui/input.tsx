"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    icon?: ReactNode;
    trailing?: ReactNode;
    error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, icon, trailing, error, ...props }, ref) => (
        <div className="relative">
            {icon && (
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant">
                    {icon}
                </span>
            )}
            <input
                ref={ref}
                aria-invalid={error}
                className={cn(
                    "block w-full rounded-lg border bg-surface-container-lowest py-3 text-base text-on-surface outline-none transition-shadow placeholder:text-on-surface-variant/70",
                    icon ? "pl-10" : "pl-3",
                    trailing ? "pr-10" : "pr-3",
                    error
                        ? "border-error focus:border-error focus:ring-2 focus:ring-error"
                        : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary",
                    className,
                )}
                {...props}
            />
            {trailing && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {trailing}
                </span>
            )}
        </div>
    ),
);
Input.displayName = "Input";