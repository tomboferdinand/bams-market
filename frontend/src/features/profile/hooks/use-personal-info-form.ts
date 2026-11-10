"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personalInfoSchema, type PersonalInfoValues } from "../schemas";
import { updateMyProfile } from "@/services/profile.service";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/services/api";
import type { AuthUser } from "@/types/auth";

const EMPTY_VALUES: PersonalInfoValues = { firstName: "", lastName: "", email: "", phone: "" };

export function usePersonalInfoForm(user: AuthUser | null) {
    const { setUser } = useAuth();
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const form = useForm<PersonalInfoValues>({
        resolver: zodResolver(personalInfoSchema),
        defaultValues: EMPTY_VALUES,
    });

    // Remplit le formulaire dès que l'utilisateur devient disponible
    // (au lieu de dépendre de defaultValues, évalué une seule fois au montage).
    useEffect(() => {
        if (user) {
            form.reset({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email ?? "",
                phone: user.phone ?? "",
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    async function onSubmit(values: PersonalInfoValues) {
        setServerError(null);
        setSuccess(false);
        try {
            const updated = await updateMyProfile(values);
            setUser(updated);
            setSuccess(true);
            return true;
        } catch (err) {
            setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
            return true;
        }
    }

    return { ...form, onSubmit: form.handleSubmit(onSubmit), serverError, success };
}