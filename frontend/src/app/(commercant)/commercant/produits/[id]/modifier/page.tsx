"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Ban, Upload } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { COMMERCANT_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductFormFields } from "@/features/products/components/product-form-fields";
import { useProductForm } from "@/features/products/hooks/use-product-form";
import { getActiveCategories } from "@/services/categories.service";
import { getMyProducts, deactivateProduct, reactivateProduct } from "@/services/products.service";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import type { Category } from "@/types/product";
import type { Product } from "@/types/product";

export default function EditProductPage() {
    const { loading: authLoading } = useRequireRole(["COMMERCANT"]);
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const [product, setProduct] = useState<Product | null | undefined>(undefined);
    const [error, setError] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        getActiveCategories().then(setCategories).catch(() => { });
        // Pas d'endpoint GET /products/:id réservé au commerçant -> on filtre sa propre liste.
        getMyProducts()
            .then((list) => setProduct(list.find((p) => p.id === id) ?? null))
            .catch(() => setError(true));
    }, [id]);

    const form = useProductForm(product ?? null, (updated) => {
        setProduct(updated);
    });

    async function handleToggle() {
        if (!product) return;
        const updated = product.isActive ? await deactivateProduct(product.id) : await reactivateProduct(product.id);
        setProduct(updated);
        setConfirmOpen(false);
    }

    if (authLoading) return null;

    return (
        <DashboardShell title="Products" portalLabel="Merchant Portal" navItems={COMMERCANT_NAV} activeHref="/commercant/produits">
            {error && <ErrorState label="Impossible de charger ce produit." />}
            {!error && product === undefined && <LoadingState label="Chargement..." />}
            {!error && product === null && <ErrorState label="Produit introuvable ou n'appartenant pas à votre boutique." />}

            {product && (
                <>
                    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <Link href="/commercant/produits" className="mb-2 flex w-fit items-center gap-2 text-sm text-primary hover:underline">
                                <ArrowLeft size={18} /> Retour aux produits
                            </Link>
                            <h2 className="text-2xl font-bold text-on-surface">Modifier un produit</h2>
                        </div>
                        <span className="w-fit rounded-full border border-outline-variant bg-surface-container-high px-3 py-1 text-xs text-on-surface-variant">
                            Réf: #{product.id}
                        </span>
                    </div>

                    <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm md:p-8">
                        {form.serverError && <p className="mb-4 text-sm text-error">{form.serverError}</p>}

                        <div className="space-y-8">
                            <ProductFormFields register={form.register} errors={form.formState.errors} categories={categories} />

                            <hr className="border-outline-variant" />

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <div className="md:col-span-1">
                                    <h3 className="mb-2 font-semibold text-on-surface">Médias</h3>
                                    <p className="text-sm text-on-surface-variant">Gérez la photo principale du produit.</p>
                                </div>
                                <div className="md:col-span-2">
                                    <div className="flex flex-col items-center gap-6 rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-4 sm:flex-row">
                                        <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-highest">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={newImagePreview ?? product.imageUrl ?? undefined}
                                                alt={product.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="mb-3 text-sm text-on-surface-variant">L&apos;image doit être au format JPG ou PNG, max 5MB.</p>
                                            <label className="flex h-10 w-fit cursor-pointer items-center gap-2 rounded border border-outline-variant bg-surface px-4 text-sm hover:bg-surface-variant">
                                                <Upload size={18} /> Remplacer l&apos;image
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            form.setImageFile(file);
                                                            setNewImageFile(file);
                                                            setNewImagePreview(URL.createObjectURL(file));
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse items-center justify-end gap-4 border-t border-outline-variant pt-6 sm:flex-row">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full border border-error text-error hover:bg-error-container/20 sm:w-auto"
                                    onClick={() => setConfirmOpen(true)}
                                >
                                    <Ban size={20} /> {product.isActive ? "Désactiver le produit" : "Réactiver le produit"}
                                </Button>
                                <Button className="w-full sm:w-auto" loading={form.formState.isSubmitting} onClick={form.onSubmit}>
                                    Enregistrer les modifications
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <ConfirmDialog
                open={confirmOpen}
                title={product?.isActive ? "Désactiver ce produit ?" : "Réactiver ce produit ?"}
                description={
                    product?.isActive
                        ? "Ce produit ne sera plus disponible à la vente. Les données du produit seront conservées."
                        : "Ce produit redeviendra visible et disponible à la vente dans le catalogue."
                }
                confirmLabel={product?.isActive ? "Désactiver" : "Réactiver"}
                onConfirm={handleToggle}
                onCancel={() => setConfirmOpen(false)}
            />
        </DashboardShell>
    );
}