import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import type { PersonalInfoValues } from "../schemas";

export function PersonalInfoFields({
    register,
    errors,
}: {
    register: UseFormRegister<PersonalInfoValues>;
    errors: FieldErrors<PersonalInfoValues>;
}) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Prénom" htmlFor="firstName" error={errors.firstName?.message}>
                <Input id="firstName" error={!!errors.firstName} {...register("firstName")} />
            </FormField>
            <FormField label="Nom" htmlFor="lastName" error={errors.lastName?.message}>
                <Input id="lastName" error={!!errors.lastName} {...register("lastName")} />
            </FormField>
            <div className="sm:col-span-2">
                <FormField label="Adresse Email" htmlFor="email" error={errors.email?.message}>
                    <Input id="email" type="email" error={!!errors.email} {...register("email")} />
                </FormField>
            </div>
            <div className="sm:col-span-2">
                <FormField label="Numéro de téléphone" htmlFor="phone" error={errors.phone?.message}>
                    <Input id="phone" type="tel" error={!!errors.phone} {...register("phone")} />
                </FormField>
            </div>
        </div>
    );
}