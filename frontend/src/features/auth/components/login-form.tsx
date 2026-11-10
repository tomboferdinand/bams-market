"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, ArrowRight } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { loginSchema, type LoginFormValues } from "../schemas";
import { loginUser } from "@/services/auth.service";
import { useAuth } from "../auth-context";
import { ROLE_HOME } from "@/lib/routes";
import { ApiError } from "@/services/api";

export function LoginForm() {
    const router = useRouter();
    const { setUser } = useAuth();
    const [serverError, setServerError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

    async function onSubmit(values: LoginFormValues) {
        setServerError(null);
        try {
            const user = await loginUser(values);
            setUser(user);
            router.push(ROLE_HOME[user.role]);
        } catch (err) {
            setServerError(
                err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.",
            );
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            {serverError && (
                <div className="rounded-lg border border-error bg-error-container px-4 py-3 text-sm text-on-error-container">
                    {serverError}
                </div>
            )}

            <FormField label="Email ou Téléphone" htmlFor="identifier" error={errors.identifier?.message}>
                <Input
                    id="identifier"
                    placeholder="exemple@email.com"
                    autoComplete="username"
                    icon={<User size={18} />}
                    error={!!errors.identifier}
                    {...register("identifier")}
                />
            </FormField>

            <FormField label="Mot de passe" htmlFor="password" error={errors.password?.message}>
                <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    error={!!errors.password}
                    {...register("password")}
                />
            </FormField>

            <div className="-mt-2 text-right">
                <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-primary hover:underline">
                    Mot de passe oublié ?
                </Link>
            </div>

            <Button type="submit" loading={isSubmitting} className="mt-2">
                Se connecter
                <ArrowRight size={18} />
            </Button>
        </form>
    );
}
