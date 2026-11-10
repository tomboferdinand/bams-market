"use client";

import { useEffect, useState } from "react";
import { Edit, MapPin, Phone, MapPinOff } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { COMMERCANT_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { ShopFormFields } from "@/features/shops/components/shop-form-fields";
import { ShopStatusBadge } from "@/features/shops/components/shop-status-badge";
import { useShopForm } from "@/features/shops/hooks/use-shop-form";
import { getMyShop } from "@/services/shops.service";
import type { Shop } from "@/types/shop";

export default function BoutiquePage() {
    const { loading: authLoading } = useRequireRole(["COMMERCANT"]);
    const [shop, setShop] = useState<Shop | null | undefined>(undefined); // undefined = pas encore chargé
    const [error, setError] = useState(false);
    const [editing, setEditing] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        getMyShop()
            .then((data) => {
                setShop(data);
                setLogoPreview(data?.logoUrl ?? null);
                if (!data) setEditing(true); // pas de boutique -> ouvrir directement le formulaire de création
            })
            .catch(() => setError(true));
    }, []);

    const form = useShopForm(shop ?? null, (updated) => {
        setShop(updated);
        setLogoPreview(updated.logoUrl);
        setEditing(false);
    });

    function handleLogoChange(file: File) {
        form.setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    }

    if (authLoading) return null;

    return (
        <DashboardShell title= "Ma Boutique" portalLabel = "Merchant Portal" navItems = { COMMERCANT_NAV } activeHref = "/commercant/boutique" >
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center" >
                <div>
                <h2 className="text-2xl font-bold text-on-background" > Ma Boutique </h2>
                    < p className = "mt-1 text-on-surface-variant" > Gérez les informations et l & apos;apparence de votre boutique.</p>
                        </div>
    { shop && <ShopStatusBadge status={ shop.status } /> }
    </div>

    { error && <ErrorState label="Impossible de charger votre boutique." />}
    { !error && shop === undefined && <LoadingState label="Chargement..." />}

    {
        !error && shop !== undefined && (
            <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3" >
                <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm lg:col-span-2" >
                    { form.serverError && <p className="mb-4 text-sm text-error"> { form.serverError } </p> }

        {
            editing ? (
                <>
                <ShopFormFields
                  register= { form.register }
                  errors = { form.formState.errors }
            logoPreview = { logoPreview }
            onLogoChange = { handleLogoChange }
                />
                <div className="mt-6 flex justify-end gap-2 border-t border-outline-variant pt-6" >
                    { shop && (
                        <Button type="button" variant = "ghost" className = "w-auto" onClick = {() => setEditing(false)
        }>
            Annuler
            </Button>
                  )
    }
    <Button
                    type="button"
    className = "w-auto"
    loading = { form.formState.isSubmitting }
    onClick = { async() => {
        const ok = await form.onSubmit();
        if (ok) setEditing(false);
    }
}
                  >
    { shop? "Enregistrer": "Créer ma boutique" }
    </Button>
    </div>
    </>
            ) : (
    shop && (
        <>
        <div className= "mb-6 flex flex-col gap-6 sm:flex-row" >
    <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low" >
    {
        shop.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src= { shop.logoUrl } alt={ shop.name } className="h-full w-full object-cover" />
                      ) : null}
        </div>
        < div className = "flex-1" >
            <label className="mb-1 block text-xs text-on-surface-variant" > Nom de la boutique </label>
                < h3 className = "mb-4 text-xl font-bold text-on-surface" > { shop.name } </h3>
                    < label className = "mb-1 block text-xs text-on-surface-variant" > Description </label>
                        < p className = "text-sm text-on-surface-variant" > { shop.description } </p>
                            </div>
                            </div>
                            < div className = "flex justify-end border-t border-outline-variant pt-6" >
                                <Button className="w-auto" onClick = {() => setEditing(true)}>
                                    <Edit size={ 18 } /> Modifier les informations
                                        </Button>
                                        </div>
                                        </>
              )
            )}
</div>

{
    shop && (
        <div className="flex flex-col gap-gutter" >
            <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm" >
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-on-surface" > Contact </h3>
                    < div className = "flex flex-col gap-4" >
                        <div className="flex items-start gap-3" >
                            <MapPin size={ 20 } className = "mt-0.5 text-on-surface-variant" />
                                <div>
                                <label className="block text-xs text-on-surface-variant" > Adresse physique </label>
                                    < p className = "text-sm text-on-surface" > { shop.address } </p>
                                        </div>
                                        </div>
                                        < div className = "flex items-start gap-3" >
                                            <Phone size={ 20 } className = "mt-0.5 text-on-surface-variant" />
                                                <div>
                                                <label className="block text-xs text-on-surface-variant" > Téléphone </label>
                                                    < p className = "text-sm text-on-surface" > { shop.contactPhone } </p>
                                                        </div>
                                                        </div>
                                                        </div>
                                                        </div>

                                                        < div className = "flex min-h-45 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-on-surface-variant shadow-sm" >
                                                            <MapPinOff size={ 28 } />
                                                                < p className = "text-sm" > Carte non disponible pour le moment </p>
                                                                    </div>
                                                                    </div>
          )
}
</div>
      )}
</DashboardShell>
  );
}
