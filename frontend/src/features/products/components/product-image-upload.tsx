"use client";

import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

interface Props {
    preview: string | null;
    onChange: (file: File) => void;
    onRemove?: () => void;
}

export function ProductImageUpload({ preview, onChange, onRemove }: Props) {
    const [dragging, setDragging] = useState(false);

    function handleFile(file: File) {
        if (file.type.startsWith("image/")) onChange(file);
    }

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
            }}
            className={`relative flex h-64 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${dragging ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-lowest"
                }`}
        >
            {preview ? (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Aperçu" className="h-full w-full object-cover" />
                    {onRemove && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="absolute right-2 top-2 rounded-full bg-surface p-2 text-error shadow-lg hover:bg-error-container"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </>
            ) : (
                <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center">
                    <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <ImagePlus size={28} className="text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-on-surface">Cliquez ou glissez une image ici</p>
                    <p className="text-xs text-on-surface-variant">PNG, JPG jusqu&apos;à 5MB</p>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                </label>
            )}
        </div>
    );
}