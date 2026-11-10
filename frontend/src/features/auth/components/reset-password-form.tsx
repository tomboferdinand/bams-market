"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { resetPasswordSchema, type ResetPasswordFormValues } from "../schemas";
import { resetPassword } from "@/services/auth.service";
import { ApiError } from "@/services/api";

export function ResetPasswordForm() {
    const token = useSearchParams().get("token");
    const [done, setDone] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

    async function onSubmit(values: ResetPasswordFormValues) {
        if (!token) return;
        setServerError(null);
        try {
            await resetPassword(token, values.newPassword);
            setDone(true);
        } catch (err) {
            setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.");
        }
    }

    if (!token) {
        return (
            <div className="space-y-4 text-center">
                <p className="text-sm text-on-surface-variant">Lien de réinitialisation invalide ou incomplet.</p>
                <Link href="/mot-de-passe-oublie" className="font-semibold text-primary hover:underline">
                    Demander un nouveau lien
                </Link>
            </div>
        );
    }

    if (done) {
        return (
            <div className="flex flex-col items-center gap-3 text-center" role="status">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container/15 text-primary">
                    <CheckCircle2 size={26} />
                </div>
                <h2 className="text-lg font-bold text-on-surface">Mot de passe modifié</h2>
                <p className="text-sm text-on-surface-variant">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                <Link href="/connexion" className="mt-2 font-semibold text-primary hover:underline">
                    Aller à la connexion
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            {serverError && (
                <div className="rounded-lg border border-error bg-error-container px-4 py-3 text-sm text-on-error-container">
                    {serverError}{" "}
                    <Link href="/mot-de-passe-oublie" className="font-semibold underline">
                        Demander un nouveau lien
                    </Link>
                </div>
            )}
            <FormField label="Nouveau mot de passe" htmlFor="newPassword" error={errors.newPassword?.message}>
                <PasswordInput id="newPassword" placeholder="••••••••" showLockIcon={false} error={!!errors.newPassword} {...register("newPassword")} />
                <p className="text-[11px] leading-tight text-on-surface-variant">
                    Au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.
                </p>
            </FormField>
            <FormField label="Confirmer le mot de passe" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
                <PasswordInput id="confirmPassword" placeholder="••••••••" showLockIcon={false} error={!!errors.confirmPassword} {...register("confirmPassword")} />
            </FormField>
            <Button type="submit" loading={isSubmitting}>
                Réinitialiser le mot de passe
            </Button>
        </form>
    );
}
