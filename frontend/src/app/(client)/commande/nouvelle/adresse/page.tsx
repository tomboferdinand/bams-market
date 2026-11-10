"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { LoadingState, ErrorState } from "@/components/feedback/data-states";
import { getAddresses, createAddress } from "@/services/addresses.service";
import type { Address } from "@/types/address";

export default function CheckoutAddressPage() {
    const router = useRouter();
    const [addresses, setAddresses] = useState<Address[] | null>(null);
    const [error, setError] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);

    const [label, setLabel] = useState("");
    const [fullAddress, setFullAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [isDefault, setIsDefault] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getAddresses()
            .then((list) => {
                setAddresses(list);
                const def = list.find((a) => a.isDefault) ?? list[0];
                if (def) setSelectedId(def.id);
                if (list.length === 0) setShowForm(true);
            })
            .catch(() => setError(true));
    }, []);

    async function handleCreate() {
        setFormError(null);
        if (label.trim().length < 2 || fullAddress.trim().length < 5 || !/^(\+261|0)(32|33|34|38)\d{7}$/.test(phone)) {
            setFormError("Vérifiez le libellé, l'adresse et le format du téléphone (ex: 034XXXXXXX).");
            return;
        }
        setSaving(true);
        try {
            const created = await createAddress({ label, fullAddress, phone, isDefault });
            setAddresses((prev) => [...(prev ?? []), created]);
            setSelectedId(created.id);
            setShowForm(false);
        } catch {
            setFormError("Une erreur est survenue.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />
            <main className="mx-auto w-full max-w-3xl flex-grow px-4 py-8 md:px-8">
                <button onClick={() => router.push("/panier")} className="mb-4 flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary">
                    <ArrowLeft size={18} /> Retour au panier
                </button>

                <h1 className="text-2xl font-bold text-on-background md:text-3xl">Adresse de livraison</h1>
                <p className="mt-2 text-on-surface-variant">Où souhaitez-vous être livré à Fianarantsoa ?</p>

                {error && <ErrorState label="Impossible de charger vos adresses." />}
                {!error && addresses === null && <LoadingState label="Chargement..." />}

                {addresses && (
                    <>
                        {addresses.length > 0 && (
                            <section className="mt-8">
                                <h2 className="mb-4 text-lg font-bold text-on-background">Adresses enregistrées</h2>
                                <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
                                    {addresses.map((addr) => (
                                        <button
                                            key={addr.id}
                                            onClick={() => setSelectedId(addr.id)}
                                            className={`relative rounded-lg border-2 p-4 text-left shadow-sm transition-shadow hover:shadow-md ${selectedId === addr.id ? "border-primary" : "border-outline-variant"
                                                }`}
                                        >
                                            <div className="absolute right-4 top-4">
                                                {selectedId === addr.id ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-outline" />}
                                            </div>
                                            <span className="mb-2 inline-block rounded-full bg-surface-variant px-2 py-1 text-xs font-semibold text-on-surface-variant">
                                                {addr.label} {addr.isDefault && "· Principale"}
                                            </span>
                                            <p className="mb-1 text-sm text-on-surface-variant">{addr.fullAddress}</p>
                                            <p className="text-xs text-on-surface-variant">{addr.city}</p>
                                            <p className="mt-2 text-xs text-on-surface-variant">{addr.phone}</p>
                                        </button>
                                    ))}
                                </div>
                                {!showForm && (
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-outline py-4 text-on-surface-variant hover:border-primary hover:text-primary md:w-auto md:px-6"
                                    >
                                        <Plus size={20} /> Ajouter une nouvelle adresse
                                    </button>
                                )}
                            </section>
                        )}

                        {showForm && (
                            <section className="mt-8 rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-sm md:p-8">
                                <h2 className="mb-4 text-lg font-bold text-on-background">Nouvelle adresse</h2>
                                {formError && <p className="mb-4 text-sm text-error">{formError}</p>}
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-on-surface-variant">Libellé (ex: Maison, Travail)</label>
                                        <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded border border-outline-variant p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-on-surface-variant">Adresse détaillée (quartier, lot, repère)</label>
                                        <textarea value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} rows={3} placeholder="Ex: Tambohobe, Lot 123 AB, près de la station Galana" className="w-full rounded border border-outline-variant p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-on-surface-variant">Téléphone</label>
                                        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="034XXXXXXX" className="w-full rounded border border-outline-variant p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                                        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded border-outline-variant text-primary" />
                                        Définir comme adresse principale
                                    </label>
                                    <button
                                        disabled={saving}
                                        onClick={handleCreate}
                                        className="rounded bg-primary px-6 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-60"
                                    >
                                        {saving ? "Enregistrement..." : "Enregistrer l'adresse"}
                                    </button>
                                </div>
                            </section>
                        )}

                        <div className="mt-8 flex justify-end border-t border-outline-variant pt-6">
                            <button
                                disabled={!selectedId}
                                onClick={() => router.push(`/commande/nouvelle/recapitulatif?addressId=${selectedId}`)}
                                className={`flex h-11 items-center justify-center gap-2 rounded-lg px-8 font-semibold shadow-sm ${selectedId ? "bg-primary text-on-primary hover:bg-primary-container" : "cursor-not-allowed bg-surface-variant text-on-surface-variant"
                                    }`}
                            >
                                Continuer <ArrowRight size={20} />
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}