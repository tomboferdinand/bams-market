"use client";

import { useState } from "react";
import { Badge, Phone, Mail, Edit, LockKeyhole } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LIVREUR_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PersonalInfoFields } from "@/features/profile/components/personal-info-fields";
import { ChangePasswordFields } from "@/features/profile/components/change-password-fields";
import { usePersonalInfoForm } from "@/features/profile/hooks/use-personal-info-form";
import { useChangePasswordForm } from "@/features/profile/hooks/use-change-password-form";

export default function LivreurProfilPage() {
    const { user, loading } = useRequireRole(["LIVREUR"]);
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);

    const infoForm = usePersonalInfoForm(user);
    const passwordForm = useChangePasswordForm();

    if (loading || !user) return null;

    return (
        <DashboardShell title="Profil Livreur" portalLabel="Espace Livreur" navItems={LIVREUR_NAV} activeHref="/livreur/profil">
            <h2 className="text-3xl font-bold text-on-background">Profil Livreur</h2>
            <p className="mt-2 text-on-surface-variant">Gérez vos informations personnelles et vos paramètres de sécurité.</p>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
                <div className="flex flex-col items-center rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm md:col-span-4">
                    <Avatar name={`${user.firstName} ${user.lastName}`} role={user.role} size={128} className="mb-4" />
                    <h3 className="text-xl font-bold text-on-surface">{user.firstName} {user.lastName}</h3>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-xs text-on-surface-variant">Livreur Actif</span>
                    </div>
                    <div className="mt-8 w-full border-t border-outline-variant pt-6 text-center">
                        <p className="text-2xl font-bold text-primary">0</p>
                        <p className="text-xs uppercase tracking-wider text-on-surface-variant">Livraisons effectuées</p>
                    </div>
                </div>

                <div className="flex flex-col gap-6 md:col-span-8">
                    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
                        <h4 className="mb-6 border-b border-surface-container-high pb-4 text-lg font-bold text-on-surface">
                            Informations Professionnelles
                        </h4>
                        {!editOpen ? (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label className="text-xs uppercase tracking-wider text-on-surface-variant">Nom</label>
                                    <p className="mt-1 font-medium text-on-surface">{user.lastName}</p>
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-wider text-on-surface-variant">Prénom</label>
                                    <p className="mt-1 font-medium text-on-surface">{user.firstName}</p>
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-wider text-on-surface-variant">Téléphone</label>
                                    <p className="mt-1 font-medium text-on-surface">{user.phone ?? "—"}</p>
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-wider text-on-surface-variant">Email</label>
                                    <p className="mt-1 font-medium text-on-surface">{user.email ?? "—"}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {infoForm.serverError && <p className="mb-4 text-sm text-error">{infoForm.serverError}</p>}
                                {infoForm.success && <p className="mb-4 text-sm text-primary">Profil mis à jour.</p>}
                                <PersonalInfoFields register={infoForm.register} errors={infoForm.formState.errors} />
                                <Button type="button" className="mt-4 w-auto" loading={infoForm.formState.isSubmitting} onClick={infoForm.onSubmit}>
                                    Enregistrer
                                </Button>
                            </>
                        )}
                    </div>

                    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
                        <h4 className="mb-6 border-b border-surface-container-high pb-4 text-lg font-bold text-on-surface">Actions du compte</h4>
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <Button type="button" className="w-auto" onClick={() => setEditOpen((v) => !v)}>
                                <Edit size={16} /> {editOpen ? "Fermer l'édition" : "Modifier le profil"}
                            </Button>
                            <Button type="button" variant="ghost" className="w-auto border border-outline-variant" onClick={() => setPasswordOpen((v) => !v)}>
                                <LockKeyhole size={16} /> Changer le mot de passe
                            </Button>
                        </div>

                        {passwordOpen && (
                            <div className="mt-6 border-t border-outline-variant pt-6">
                                {passwordForm.serverError && <p className="mb-4 text-sm text-error">{passwordForm.serverError}</p>}
                                {passwordForm.success && <p className="mb-4 text-sm text-primary">Mot de passe modifié.</p>}
                                <ChangePasswordFields register={passwordForm.register} errors={passwordForm.formState.errors} />
                                <Button type="button" className="mt-4 w-auto" loading={passwordForm.formState.isSubmitting} onClick={passwordForm.onSubmit}>
                                    Enregistrer
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}