import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import type { ProductFormInput } from "../schemas";
import type { Category } from "@/types/product";

interface Props {
    register: UseFormRegister<ProductFormInput>;
    errors: FieldErrors<ProductFormInput>;
    categories: Category[];
}

export function ProductFormFields({ register, errors, categories }: Props) {
    return (
        <>
            <div className="rounded-xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
                <h3 className="mb-6 border-b border-outline-variant/20 pb-4 font-semibold text-on-background">
                    Informations Générales
                </h3>
                <div className="space-y-5">
                    <FormField label="Nom du produit" htmlFor="name" error={errors.name?.message}>
                        <Input id="name" placeholder="Ex: Miel de baobab bio" error={!!errors.name} {...register("name")} />
                    </FormField>

                    <FormField label="Catégorie" htmlFor="categoryId" error={errors.categoryId?.message}>
                        <select
                            id="categoryId"
                            className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            {...register("categoryId")}
                        >
                            <option value="">Sélectionner une catégorie</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Description" htmlFor="description" error={errors.description?.message}>
                        <textarea
                            id="description"
                            rows={4}
                            placeholder="Décrivez votre produit en détail..."
                            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            {...register("description")}
                        />
                    </FormField>
                </div>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
                <h3 className="mb-6 border-b border-outline-variant/20 pb-4 font-semibold text-on-background">
                    Prix &amp; Inventaire
                </h3>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormField label="Prix (MGA)" htmlFor="price" error={errors.price?.message}>
                        <Input id="price" type="number" min={1} step={100} error={!!errors.price} {...register("price")} />
                    </FormField>
                    <FormField label="Quantité en stock" htmlFor="stock" error={errors.stock?.message}>
                        <Input id="stock" type="number" min={0} step={1} error={!!errors.stock} {...register("stock")} />
                    </FormField>
                </div>
            </div>
        </>
    );
}