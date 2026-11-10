import { z } from "zod";
import { PHONE_REGEX } from "@/lib/validation/auth";

export const shopSchema = z.object({
    name: z.string().min(2, "Nom trop court."),
    description: z.string().min(10, "Description trop courte (10 caractères min)."),
    address: z.string().min(5, "Adresse trop courte."),
    contactPhone: z.string().regex(PHONE_REGEX, "Numéro invalide (ex: 034XXXXXXX)."),
});
export type ShopFormValues = z.infer<typeof shopSchema>;