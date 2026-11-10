"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordValues } from "../schemas";
import { changeMyPassword } from "@/services/profile.service";
import { ApiError } from "@/services/api";

export function useChangePasswordForm() {
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const form = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

    async function onSubmit(values: ChangePasswordValues) {
        setServerError(null);
        setSuccess(false);
        try {
            await changeMyPassword(values);
            setSuccess(true);
            form.reset();
            return true;
        } catch (err) {
            setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
            return true;
        }
    }

    return { ...form, onSubmit: form.handleSubmit(onSubmit), serverError, success };
}