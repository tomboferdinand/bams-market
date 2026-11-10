"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shopSchema, type ShopFormValues } from "../schemas";
import { createShop, updateShop } from "@/services/shops.service";
import { ApiError } from "@/services/api";
import type { Shop } from "@/types/shop";

export function useShopForm(existingShop: Shop | null, onSuccess: (shop: Shop) => void) {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);

    const form = useForm<ShopFormValues>({
        resolver: zodResolver(shopSchema),
        defaultValues: {
            name: existingShop?.name ?? "",
            description: existingShop?.description ?? "",
            address: existingShop?.address ?? "",
            contactPhone: existingShop?.contactPhone ?? "",
        },
    });

    async function onSubmit(values: ShopFormValues) {
        setServerError(null);
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("description", values.description);
        formData.append("address", values.address);
        formData.append("contactPhone", values.contactPhone);
        if (logoFile) formData.append("logo", logoFile);

        try {
            const shop = existingShop ? await updateShop(formData) : await createShop(formData);
            onSuccess(shop);
            return true;
        } catch (err) {
            setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
            return false;
        }
    }

    return { ...form, onSubmit: form.handleSubmit(onSubmit), serverError, logoFile, setLogoFile };
}