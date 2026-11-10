"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit, MapPin, Lock, LogOut, Briefcase } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PersonalInfoFields } from "@/features/profile/components/personal-info-fields";
import { ChangePasswordFields } from "@/features/profile/components/change-password-fields";
import { usePersonalInfoForm } from "@/features/profile/hooks/use-personal-info-form";
import { useChangePasswordForm } from "@/features/profile/hooks/use-change-password-form";
import { useAuth } from "@/features/auth/auth-context";

function memberSince(createdAt: string) {
    return new Date(createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function ClientProfilPage() {
    const { user, loading, logout } = useAuth();
    const [editOpen, setEditOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const infoForm = usePersonalInfoForm(user);
    const passwordForm = useChangePasswordForm();

    if (loading || !user) return null;

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />

            <main className="mx-auto w-full max-w-7xl flex-grow px-4 py-8 md:px-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-on-background md:text-3xl">Mon Profil</h1>
                    <p className="mt-2 text-on-surface-variant">Gérez vos informations personnelles et vos paramètres de sécurité.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                    <aside className="md:col-span-4 lg:col-span-3">
                        <div className="flex flex-col items-center rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center shadow-sm">
                            <Avatar name={`${user.firstName} ${user.lastName}`} role={user.role} size={96} className="mb-4 border-2 border-primary-container" />
                            <h2 className="text-lg font-bold text-on-surface">{user.firstName} {user.lastName}</h2>
                            <p className="mb-4 text-sm text-on-surface-variant">Client depuis {memberSince(user.createdAt as unknown as string)}</p>
                            <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-on-primary-container">
                                {user.verificationStatus === "VERIFIE" ? "Compte Vérifié" : "Membre Actif"}
                            </span>
                        </div>
                    </aside>

                    <div className="flex flex-col gap-6 md:col-span-8 lg:col-span-9">
                        {/* Informations Personnelles — mode bascule */}
                        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                            <div className="mb-6 flex items-center justify-between border-b border-outline-variant pb-4">
                                <h3 className="text-lg font-bold text-on-surface">Informations Personnelles</h3>
                                {!editOpen && (
                                    <Button type="button" variant="ghost" className="w-auto border border-outline" onClick={() => setEditOpen(true)}>
                                        <Edit size={16} /> Modifier le profil
                                    </Button>
                                )}
                            </div>

                            {!editOpen ? (
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-on-surface-variant">Prénom</label>
                                        <p className="mt-1 font-medium text-on-surface">{user.firstName}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-wider text-on-surface-variant">Nom</label>
                                        <p className="mt-1 font-medium text-on-surface">{user.lastName}</p>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs uppercase tracking-wider text-on-surface-variant">Adresse Email</label>
                                        <p className="mt-1 font-medium text-on-surface">{user.email ?? "—"}</p>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-xs uppercase tracking-wider text-on-surface-variant">Numéro de téléphone</label>
                                        <p className="mt-1 font-medium text-on-surface">{user.phone ?? "—"}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {infoForm.serverError && <p className="mb-4 text-sm text-error">{infoForm.serverError}</p>}
                                    {infoForm.success && <p className="mb-4 text-sm text-primary">Profil mis à jour avec succès.</p>}
                                    <PersonalInfoFields register={infoForm.register} errors={infoForm.formState.errors} />
                                    <div className="mt-4 flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="w-auto"
                                            onClick={() => {
                                                infoForm.reset();
                                                setEditOpen(false);
                                            }}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            type="button"
                                            className="w-auto"
                                            loading={infoForm.formState.isSubmitting}
                                            onClick={async () => {
                                                const ok = await infoForm.onSubmit();
                                                if (ok) setEditOpen(false);
                                            }}
                                        >
                                            Enregistrer
                                        </Button>
                                    </div>
                                </>
                            )}
                        </section>

                        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="flex cursor-not-allowed items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 opacity-60 shadow-sm">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container text-primary">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h4 className="mb-1 font-semibold text-on-surface">Mes adresses</h4>
                                    <p className="text-sm text-on-surface-variant">Bientôt disponible.</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="group flex items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-left shadow-sm transition-colors hover:border-primary"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container text-primary group-hover:bg-primary-container group-hover:text-on-primary-container">
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <h4 className="mb-1 font-semibold text-on-surface group-hover:text-primary">Changer le mot de passe</h4>
                                    <p className="text-sm text-on-surface-variant">Mettez à jour votre mot de passe.</p>
                                </div>
                            </button>

                            {user.role === "CLIENT" && (
                                <Link
                                    href="/devenir-partenaire"
                                    className="group flex items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm transition-colors hover:border-primary sm:col-span-2"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container text-primary group-hover:bg-primary-container group-hover:text-on-primary-container">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <h4 className="mb-1 font-semibold text-on-surface group-hover:text-primary">Devenir commerçant ou livreur</h4>
                                        <p className="text-sm text-on-surface-variant">Vendez vos produits ou livrez des commandes sur Bam&apos;S Market.</p>
                                    </div>
                                </Link>
                            )}
                        </section>

                        {showPassword && (
                            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
                                <h3 className="mb-6 border-b border-outline-variant pb-4 text-lg font-bold text-on-surface">Sécurité</h3>
                                {passwordForm.serverError && <p className="mb-4 text-sm text-error">{passwordForm.serverError}</p>}
                                {passwordForm.success && <p className="mb-4 text-sm text-primary">Mot de passe modifié avec succès.</p>}
                                <ChangePasswordFields register={passwordForm.register} errors={passwordForm.formState.errors} />
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button type="button" variant="ghost" className="w-auto" onClick={() => setShowPassword(false)}>
                                        Annuler
                                    </Button>
                                    <Button
                                        type="button"
                                        className="w-auto"
                                        loading={passwordForm.formState.isSubmitting}
                                        onClick={async () => {
                                            const ok = await passwordForm.onSubmit();
                                            if (ok) setShowPassword(false);
                                        }}
                                    >
                                        Enregistrer
                                    </Button>
                                </div>
                            </section>
                        )}

                        <button
                            onClick={logout}
                            className="flex items-center gap-4 rounded-xl border border-error-container bg-error-container p-6 text-left text-on-error-container shadow-sm transition-colors hover:bg-error hover:text-on-error"
                        >
                            <LogOut size={20} />
                            <div>
                                <h4 className="font-semibold">Déconnexion</h4>
                                <p className="text-sm opacity-80">Se déconnecter de votre compte Bam&apos;S Market.</p>
                            </div>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
