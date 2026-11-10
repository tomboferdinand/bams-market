import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { Camera } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import type { ShopFormValues } from "../schemas";

interface Props {
    register: UseFormRegister<ShopFormValues>;
    errors: FieldErrors<ShopFormValues>;
    logoPreview: string | null;
    onLogoChange: (file: File) => void;
}

export function ShopFormFields({ register, errors, logoPreview, onLogoChange }: Props) {
    return (
        <div className="flex flex-col gap-5 sm:flex-row">
            <div className="flex flex-shrink-0 flex-col items-center gap-3">
                <div className="h-32 w-32 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low">
                    {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full items-center justify-center text-on-surface-variant">
                            <Camera size={28} />
                        </div>
                    )}
                </div>
                <label className="flex h-11 w-32 cursor-pointer items-center justify-center gap-2 rounded-lg border border-outline text-sm font-semibold text-on-surface hover:bg-surface-container-low">
                    <Camera size={18} /> Logo
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && onLogoChange(e.target.files[0])}
                    />
                </label>
            </div>

            <div className="flex flex-1 flex-col gap-4">
                <FormField label="Nom de la boutique" htmlFor="name" error={errors.name?.message}>
                    <Input id="name" error={!!errors.name} {...register("name")} />
                </FormField>
                <FormField label="Description" htmlFor="description" error={errors.description?.message}>
                    <textarea
                        id="description"
                        rows={3}
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        {...register("description")}
                    />
                </FormField>
                <FormField label="Adresse physique (Fianarantsoa)" htmlFor="address" error={errors.address?.message}>
                    <Input id="address" error={!!errors.address} {...register("address")} />
                </FormField>
                <FormField label="Téléphone" htmlFor="contactPhone" error={errors.contactPhone?.message}>
                    <Input id="contactPhone" error={!!errors.contactPhone} {...register("contactPhone")} />
                </FormField>
            </div>
        </div>
    );
}