"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductFormValues, type ProductFormInput } from "../schemas";
import { createProduct, updateProduct } from "@/services/products.service";
import { ApiError } from "@/services/api";
import type { Product } from "@/types/product";

const EMPTY_VALUES: ProductFormInput = {
  name: "",
  description: "",
  price: 0,
  stock: 0,
  categoryId: 0,
};

export function useProductForm(existing: Product | null, onSuccess: (p: Product) => void) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Remplit le formulaire dès que le produit devient disponible (chargement async),
  // au lieu de dépendre de defaultValues, capturé une seule fois au montage.
  useEffect(() => {
    if (existing) {
      form.reset({
        name: existing.name,
        description: existing.description,
        price: existing.price,
        stock: existing.stock,
        categoryId: existing.categoryId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  async function onSubmit(values: ProductFormValues) {
    setServerError(null);
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("description", values.description);
    formData.append("price", String(values.price));
    formData.append("stock", String(values.stock));
    formData.append("categoryId", String(values.categoryId));
    if (imageFile) formData.append("image", imageFile);

    try {
      const product = existing
        ? await updateProduct(existing.id, formData)
        : await createProduct(formData);
      onSuccess(product);
      return true;
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      return false;
    }
  }

  return { ...form, onSubmit: form.handleSubmit(onSubmit), serverError, imageFile, setImageFile };
}