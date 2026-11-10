import { z } from "zod";
import { PHONE_REGEX, PASSWORD_REGEX } from "@/lib/validation/auth";

export const personalInfoSchema = z
    .object({
        firstName: z.string().min(2, "Prénom trop court."),
        lastName: z.string().min(2, "Nom trop court."),
        email: z.string().email("Format invalide.").optional().or(z.literal("")),
        phone: z.string().regex(PHONE_REGEX, "Numéro invalide.").optional().or(z.literal("")),
    })
    .refine((d) => d.email || d.phone, {
        message: "Renseignez un e-mail ou un téléphone.",
        path: ["email"],
    });
export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Requis."),
        newPassword: z.string().min(8, "8 caractères minimum.").regex(PASSWORD_REGEX, "Majuscule, minuscule, chiffre requis."),
        confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
        message: "Les mots de passe ne correspondent pas.",
        path: ["confirmPassword"],
    });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;