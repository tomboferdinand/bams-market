"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { registerSchema, type RegisterFormValues } from "../schemas";
import { registerUser } from "@/services/auth.service";
import { useAuth } from "../auth-context";
import { ROLE_HOME } from "@/lib/routes";
import { ApiError } from "@/services/api";

export function RegisterForm() {
    const router = useRouter();
    const { setUser } = useAuth();
    const [serverError, setServerError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

    async function onSubmit(values: RegisterFormValues) {
        setServerError(null);
        try {
            const user = await registerUser(values);
            setUser(user);
            router.push(ROLE_HOME[user.role]); // toujours CLIENT à l'inscription publique
        } catch (err) {
            setServerError(
                err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.",
            );
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && (
                <div className="rounded-lg border border-error bg-error-container px-4 py-3 text-sm text-on-error-container">
                    {serverError}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Prénom" htmlFor="firstName" error={errors.firstName?.message}>
                    <Input id="firstName" placeholder="Jean" error={!!errors.firstName} {...register("firstName")} />
                </FormField>
                <FormField label="Nom" htmlFor="lastName" error={errors.lastName?.message}>
                    <Input id="lastName" placeholder="Dupont" error={!!errors.lastName} {...register("lastName")} />
                </FormField>
            </div>

            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" autoComplete="email" placeholder="jean.dupont@exemple.com" error={!!errors.email} {...register("email")} />
                <p className="text-[11px] leading-tight text-on-surface-variant">
                    Un lien de confirmation y sera envoyé. Il servira aussi à récupérer votre compte.
                </p>
            </FormField>

            <FormField label="Téléphone" htmlFor="phone" error={errors.phone?.message}>
                <Input id="phone" type="tel" autoComplete="tel" placeholder="034 00 000 00" error={!!errors.phone} {...register("phone")} />
                <p className="text-[11px] leading-tight text-on-surface-variant">
                    Numéro malgache (032, 033, 034 ou 038) utilisé pour la livraison et le Mobile Money.
                </p>
            </FormField>

            <FormField label="Mot de passe" htmlFor="password" error={errors.password?.message}>
                <PasswordInput id="password" placeholder="••••••••" showLockIcon={false} error={!!errors.password} {...register("password")} />
                <p className="text-[11px] leading-tight text-on-surface-variant">
                    Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.
                </p>
            </FormField>

            <FormField label="Confirmer le mot de passe" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
                <PasswordInput id="confirmPassword" placeholder="••••••••" showLockIcon={false} error={!!errors.confirmPassword} {...register("confirmPassword")} />
            </FormField>

            <div className="flex items-start gap-3 pt-2">
                <Checkbox id="terms" {...register("terms")} />
                <label htmlFor="terms" className="cursor-pointer text-sm text-on-surface-variant">
                    J&apos;accepte les{" "}
                    <a href="#" className="font-medium text-primary hover:underline">conditions générales d&apos;utilisation</a>{" "}
                    et la{" "}
                    <a href="#" className="font-medium text-primary hover:underline">politique de confidentialité</a>.
                </label>
            </div>
            {errors.terms && <p className="text-xs text-error">{errors.terms.message}</p>}

            <Button type="submit" loading={isSubmitting} className="mt-2">
                S&apos;inscrire
            </Button>
        </form>
    );
}