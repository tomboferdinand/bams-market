"use client";

import { useState } from "react";
import { Mail, Phone, CalendarDays, ShieldCheck, Edit, KeyRound } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ADMIN_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PersonalInfoFields } from "@/features/profile/components/personal-info-fields";
import { ChangePasswordFields } from "@/features/profile/components/change-password-fields";
import { usePersonalInfoForm } from "@/features/profile/hooks/use-personal-info-form";
import { useChangePasswordForm } from "@/features/profile/hooks/use-change-password-form";

export default function AdminProfilPage() {
    const { user, loading } = useRequireRole(["ADMINISTRATEUR"]);
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const infoForm = usePersonalInfoForm(user);
    const passwordForm = useChangePasswordForm();

    if (loading || !user) return null;

    const joinedDate = new Date(user.createdAt as unknown as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    return (
        <DashboardShell title="Bam'S Market" portalLabel="Back-office" navItems={ADMIN_NAV} activeHref="/admin/profil">
            <h1 className="text-2xl font-bold text-on-background">Profil Administrateur</h1>
            <p className="mt-2 text-on-surface-variant">Gérez vos informations personnelles et vos paramètres de sécurité.</p>

            <div className="mt-6 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
                <div className="relative flex h-24 items-end bg-surface-container px-8 pb-4">
                    <div className="absolute -bottom-12 left-8">
                        <Avatar name={`${user.firstName} ${user.lastName}`} role={user.role} size={96} className="border-4 border-surface-container-lowest" />
                    </div>
                </div>

                <div className="px-8 pb-8 pt-16">
                    <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-xl font-bold text-on-background">{user.firstName} {user.lastName}</h2>
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-on-primary-container">
                                <ShieldCheck size={14} /> Administrateur
                            </span>
                        </div>
                        <div className="flex w-full gap-3 md:w-auto">
                            <Button type="button" variant="ghost" className="w-auto border border-outline" onClick={() => setEditOpen((v) => !v)}>
                                <Edit size={16} /> {editOpen ? "Fermer" : "Modifier le profil"}
                            </Button>
                            <Button type="button" className="w-auto" onClick={() => setPasswordOpen((v) => !v)}>
                                <KeyRound size={16} /> Changer le mot de passe
                            </Button>
                        </div>
                    </div>

                    {!editOpen ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Informations de contact</h3>
                                <div className="flex items-start gap-4 rounded-lg border border-surface-variant bg-surface p-4">
                                    <Mail size={20} className="mt-1 text-primary" />
                                    <div>
                                        <div className="mb-1 text-xs text-on-surface-variant">Adresse Email</div>
                                        <div className="text-on-background">{user.email ?? "—"}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 rounded-lg border border-surface-variant bg-surface p-4">
                                    <Phone size={20} className="mt-1 text-primary" />
                                    <div>
                                        <div className="mb-1 text-xs text-on-surface-variant">Numéro de téléphone</div>
                                        <div className="text-on-background">{user.phone ?? "—"}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Détails du compte</h3>
                                <div className="flex items-start gap-4 rounded-lg border border-surface-variant bg-surface p-4">
                                    <CalendarDays size={20} className="mt-1 text-primary" />
                                    <div>
                                        <div className="mb-1 text-xs text-on-surface-variant">Date d&apos;inscription</div>
                                        <div className="text-on-background">{joinedDate}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 rounded-lg border border-surface-variant bg-surface p-4">
                                    <ShieldCheck size={20} className="mt-1 text-primary" />
                                    <div>
                                        <div className="mb-1 text-xs text-on-surface-variant">Statut du compte</div>
                                        <div className="text-on-background">{user.accountStatus}</div>
                                    </div>
                                </div>
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

                    {passwordOpen && (
                        <div className="mt-8 border-t border-outline-variant pt-6">
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
        </DashboardShell>
    );
}