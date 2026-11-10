import { z } from "zod";
import { PHONE_REGEX } from "@/lib/validation/auth";

export const roleRequestSchema = z.object({
  requestedRole: z.enum(["COMMERCANT", "LIVREUR"], { message: "Choisissez un rôle." }),
  payoutPhone: z
    .string()
    .min(1, "Numéro Mobile Money requis.")
    .refine((v) => PHONE_REGEX.test(v.replace(/[\s.\-]/g, "")), "Numéro invalide (ex: 034XXXXXXX)."),
  message: z.string().max(500, "500 caractères maximum.").optional(),
});

export type RoleRequestFormValues = z.infer<typeof roleRequestSchema>;
