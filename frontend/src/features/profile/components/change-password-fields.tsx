import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import type { ChangePasswordValues } from "../schemas";

export function ChangePasswordFields({
    register,
    errors,
}: {
    register: UseFormRegister<ChangePasswordValues>;
    errors: FieldErrors<ChangePasswordValues>;
}) {
    return (
        <div className="flex flex-col gap-4">
            <FormField label="Mot de passe actuel" htmlFor="currentPassword" error={errors.currentPassword?.message}>
                <PasswordInput id="currentPassword" showLockIcon={false} error={!!errors.currentPassword} {...register("currentPassword")} />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Nouveau mot de passe" htmlFor="newPassword" error={errors.newPassword?.message}>
                    <PasswordInput id="newPassword" showLockIcon={false} error={!!errors.newPassword} {...register("newPassword")} />
                </FormField>
                <FormField label="Confirmer le mot de passe" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
                    <PasswordInput id="confirmPassword" showLockIcon={false} error={!!errors.confirmPassword} {...register("confirmPassword")} />
                </FormField>
            </div>
            <p className="text-xs text-on-surface-variant">
                Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.
            </p>
        </div>
    );
}