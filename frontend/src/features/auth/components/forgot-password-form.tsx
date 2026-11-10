"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../schemas";
import { forgotPassword } from "@/services/auth.service";
import { ApiError } from "@/services/api";

export function ForgotPasswordForm() {
    const [sent, setSent] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

    async function onSubmit(values: ForgotPasswordFormValues) {
        setServerError(null);
        try {
            await forgotPassword(values.email);
            setSent(true);
        } catch (err) {
            setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.");
        }
    }

    if (sent) {
        return (
            <div className="flex flex-col items-center gap-3 text-center" role="status">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container/15 text-primary">
                    <MailCheck size={26} />
                </div>
                <p className="text-sm leading-6 text-on-surface-variant">
                    Si un compte existe avec cette adresse, un lien de réinitialisation vient d&apos;être envoyé.
                    Il est valable 1 heure. Pensez à vérifier vos courriers indésirables.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            {serverError && (
                <div className="rounded-lg border border-error bg-error-container px-4 py-3 text-sm text-on-error-container">
                    {serverError}
                </div>
            )}
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" autoComplete="email" placeholder="jean.dupont@exemple.com" error={!!errors.email} {...register("email")} />
            </FormField>
            <Button type="submit" loading={isSubmitting}>
                Envoyer le lien
            </Button>
        </form>
    );
}
