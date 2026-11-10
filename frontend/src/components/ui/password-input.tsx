"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "./input";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    error?: boolean;
    showLockIcon?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ error, showLockIcon = true, ...props }, ref) => {
        const [visible, setVisible] = useState(false);

        return (
            <Input
                ref={ref}
                type={visible ? "text" : "password"}
                error={error}
                icon={showLockIcon ? <Lock size={18} /> : undefined}
                trailing={
                    <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        className="text-on-surface-variant hover:text-on-surface"
                        tabIndex={-1}
                    >
                        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                }
                {...props}
            />
        );
    },
);
PasswordInput.displayName = "PasswordInput";