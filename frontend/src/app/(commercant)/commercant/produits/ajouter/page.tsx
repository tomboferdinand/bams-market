"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { COMMERCANT_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { Button } from "@/components/ui/button";
import { ProductFormFields } from "@/features/products/components/product-form-fields";
import { ProductImageUpload } from "@/features/products/components/product-image-upload";
import { useProductForm } from "@/features/products/hooks/use-product-form";
import { getActiveCategories } from "@/services/categories.service";
import type { Category } from "@/types/product";


export default function AddProductPage() {
    const { loading: authLoading } = useRequireRole(["COMMERCANT"]);
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        getActiveCategories().then(setCategories).catch(() => { });
    }, []);

    const form = useProductForm(null, () => {
        router.push("/commercant/produits");
    });

    if (authLoading) return null;

    return (
        <DashboardShell title="Products" portalLabel="Merchant Portal" navItems={COMMERCANT_NAV} activeHref="/commercant/produits">
            <Link href="/commercant/produits" className="mb-2 flex w-fit items-center gap-2 text-sm text-on-surface-variant hover:text-primary">
                <ArrowLeft size={18} /> Retour aux produits
            </Link>
            <h2 className="text-2xl font-bold text-on-background">Ajouter un Produit</h2>
            <p className="mt-1 text-on-surface-variant">Remplissez les informations ci-dessous pour ajouter un nouvel article à votre boutique.</p>

            {form.serverError && <p className="mt-4 text-sm text-error">{form.serverError}</p>}

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <ProductFormFields register={form.register} errors={form.formState.errors} categories={categories} />
                </div>

                <div className="space-y-6">
                    <div className="rounded-xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
                        <h3 className="mb-6 border-b border-outline-variant/20 pb-4 font-semibold text-on-background">Image du produit</h3>
                        <ProductImageUpload
                            preview={imagePreview}
                            onChange={(file) => {
                                form.setImageFile(file);
                                setImagePreview(URL.createObjectURL(file));
                            }}
                            onRemove={() => {
                                form.setImageFile(null);
                                setImagePreview(null);
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button loading={form.formState.isSubmitting} onClick={form.onSubmit}>
                            <PlusCircle size={20} /> Ajouter le produit
                        </Button>
                        <Button type="button" variant="ghost" className="border border-outline" onClick={() => router.push("/commercant/produits")}>
                            Annuler
                        </Button>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}