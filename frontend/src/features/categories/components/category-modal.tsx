"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCategory, updateCategory } from "@/services/categories.service";
import { ApiError } from "@/services/api";
import type { AdminCategory } from "@/types/category-admin";

interface Props {
    open: boolean;
    category: AdminCategory | null; // null = création
    onClose: () => void;
    onSaved: (category: AdminCategory) => void;
}

export function CategoryModal({ open, category, onClose, onSaved }: Props) {
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setName(category?.name ?? "");
        setError(null);
    }, [category, open]);

    if (!open) return null;

    async function handleSave() {
        if (name.trim().length < 2) {
            setError("Le nom doit contenir au moins 2 caractères.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = category ? await updateCategory(category.id, name) : await createCategory(name);
            onSaved(result);
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
                <div className="flex items-center justify-between border-b border-outline-variant bg-surface p-6">
                    <h3 className="text-lg font-bold text-on-surface">
                        {category ? "Modifier la catégorie" : "Ajouter une Catégorie"}
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1 text-on-surface-variant hover:text-error">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {error && <p className="mb-4 text-sm text-error">{error}</p>}
                    <label className="mb-1 block text-sm font-medium text-on-surface-variant">Nom de la catégorie</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Épices et Condiments"
                        className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                </div>

                <div className="flex justify-end gap-3 border-t border-outline-variant bg-surface p-6">
                    <Button type="button" variant="ghost" className="w-auto border border-outline-variant" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button type="button" className="w-auto" loading={loading} onClick={handleSave}>
                        Enregistrer
                    </Button>
                </div>
            </div>
        </div>
    );
}