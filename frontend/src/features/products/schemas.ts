import { z } from "zod";

export const productSchema = z.object({
    name: z.string().min(2, "Nom trop court."),
    description: z.string().min(5, "Description trop courte."),
    price: z.coerce.number().int().positive("Le prix doit être supérieur à 0."),
    stock: z.coerce.number().int().min(0, "Le stock ne peut pas être négatif."),
    categoryId: z.coerce.number().int().min(1, "Choisissez une catégorie."),
});
export type ProductFormValues = z.output<typeof productSchema>; // après coercion (nombres)
export type ProductFormInput = z.input<typeof productSchema>;