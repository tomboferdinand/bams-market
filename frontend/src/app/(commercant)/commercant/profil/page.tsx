"use client";

import { useState } from "react";
import { Edit, KeyRound, Mail, Phone } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { COMMERCANT_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PersonalInfoFields } from "@/features/profile/components/personal-info-fields";
import { ChangePasswordFields } from "@/features/profile/components/change-password-fields";
import { usePersonalInfoForm } from "@/features/profile/hooks/use-personal-info-form";
import { useChangePasswordForm } from "@/features/profile/hooks/use-change-password-form";

export default function CommercantProfilPage() {
    const { user, loading } = useRequireRole(["COMMERCANT"]);
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const infoForm = usePersonalInfoForm(user);
    const passwordForm = useChangePasswordForm();

    if (loading || !user) return null;

    return (
        <DashboardShell title="Profil Commerçant" portalLabel="Merchant Portal" navItems={COMMERCANT_NAV} activeHref="/commercant/profil">
            <h2 className="mb-6 text-2xl font-bold text-on-background">Profil Commerçant</h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex flex-col items-center rounded-xl border border-outline-variant bg-surface p-6 text-center shadow-sm lg:col-span-1">
                    <Avatar name={`${user.firstName} ${user.lastName}`} role={user.role} size={96} className="mb-4" />
                    <h3 className="text-lg font-bold text-on-surface">{user.firstName} {user.lastName}</h3>
                    <p className="mb-4 text-sm text-on-surface-variant">Compte Commerçant</p>
                    {user.verificationStatus === "VERIFIE" && (
                        <span className="rounded-full bg-primary-container/20 px-3 py-1 text-xs font-semibold text-primary-container">
                            Compte Vérifié
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-6 lg:col-span-2">
                    {/* Informations personnelles */}
                    <section className="rounded-xl border border-outline-variant bg-surface shadow-sm">
                        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright p-6">
                            <h3 className="text-lg font-bold text-on-surface">Informations Personnelles</h3>
                            {!editOpen && (
                                <Button type="button" variant="ghost" className="w-auto border border-outline" onClick={() => setEditOpen(true)}>
                                    <Edit size={16} /> Modifier le profil
                                </Button>
                            )}
                        </div>
                        <div className="p-6">
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
                                    <div className="flex items-start gap-2 sm:col-span-2">
                                        <Mail size={16} className="mt-1 text-primary" />
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-on-surface-variant">Email</label>
                                            <p className="mt-1 font-medium text-on-surface">{user.email ?? "—"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 sm:col-span-2">
                                        <Phone size={16} className="mt-1 text-primary" />
                                        <div>
                                            <label className="text-xs uppercase tracking-wider text-on-surface-variant">Téléphone</label>
                                            <p className="mt-1 font-medium text-on-surface">{user.phone ?? "—"}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {infoForm.serverError && <p className="mb-4 text-sm text-error">{infoForm.serverError}</p>}
                                    {infoForm.success && <p className="mb-4 text-sm text-primary">Profil mis à jour.</p>}
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
                        </div>
                    </section>

                    {/* Sécurité */}
                    <section className="rounded-xl border border-outline-variant bg-surface shadow-sm">
                        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright p-6">
                            <h3 className="text-lg font-bold text-on-surface">Sécurité</h3>
                            {!passwordOpen && (
                                <Button type="button" className="w-auto" onClick={() => setPasswordOpen(true)}>
                                    <KeyRound size={16} /> Changer le mot de passe
                                </Button>
                            )}
                        </div>
                        {passwordOpen && (
                            <div className="p-6">
                                {passwordForm.serverError && <p className="mb-4 text-sm text-error">{passwordForm.serverError}</p>}
                                {passwordForm.success && <p className="mb-4 text-sm text-primary">Mot de passe modifié.</p>}
                                <ChangePasswordFields register={passwordForm.register} errors={passwordForm.formState.errors} />
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button type="button" variant="ghost" className="w-auto" onClick={() => setPasswordOpen(false)}>
                                        Annuler
                                    </Button>
                                    <Button
                                        type="button"
                                        className="w-auto"
                                        loading={passwordForm.formState.isSubmitting}
                                        onClick={async () => {
                                            const ok = await passwordForm.onSubmit();
                                            if (ok) setPasswordOpen(false);
                                        }}
                                    >
                                        Enregistrer
                                    </Button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </DashboardShell>
    );
}