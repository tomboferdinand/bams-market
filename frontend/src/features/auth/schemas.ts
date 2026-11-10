import { z } from "zod";
import { PHONE_REGEX, PASSWORD_REGEX } from "@/lib/validation/auth";

export const loginSchema = z.object({
    identifier: z.string().min(1, "Email ou téléphone requis."),
    password: z.string().min(1, "Mot de passe requis."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

const passwordRule = z
    .string()
    .min(8, "8 caractères minimum.")
    .regex(PASSWORD_REGEX, "Majuscule, minuscule et chiffre requis.");

// E-mail ET téléphone sont obligatoires : l'e-mail sert à vérifier le compte et à le récupérer,
// le téléphone à la livraison et aux paiements Mobile Money.
export const registerSchema = z
    .object({
        firstName: z.string().min(2, "Prénom trop court."),
        lastName: z.string().min(2, "Nom trop court."),
        email: z
            .string()
            .trim()
            .min(1, "E-mail requis.")
            .email("Format d'e-mail invalide."),
        phone: z
            .string()
            .min(1, "Numéro de téléphone requis.")
            .refine((v) => PHONE_REGEX.test(v.replace(/[\s.\-]/g, "")), "Numéro invalide (ex: 034XXXXXXX)."),
        password: passwordRule,
        confirmPassword: z.string(),
        terms: z.boolean().refine((val) => val === true, {
            message: "Vous devez accepter les conditions.",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Les mots de passe ne correspondent pas.",
        path: ["confirmPassword"],
    });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
    email: z.string().trim().min(1, "E-mail requis.").email("Format d'e-mail invalide."),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
    .object({
        newPassword: passwordRule,
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Les mots de passe ne correspondent pas.",
        path: ["confirmPassword"],
    });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
