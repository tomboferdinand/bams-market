"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Bell, Store, Menu, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/auth-context";
import { VerificationBanner } from "./verification-banner";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
    icon: LucideIcon;
    label: string;
    href: string;
}

interface DashboardShellProps {
    title: string;
    portalLabel: string;
    navItems: NavItem[];
    activeHref: string;
    children: ReactNode;
}

export function DashboardShell({ title, portalLabel, navItems, activeHref, children }: DashboardShellProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    // Sous 768 px (md), la barre latérale devient un tiroir ouvert par le bouton de l'en-tête.
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Le tiroir se referme à chaque changement de page…
    useEffect(() => {
        setDrawerOpen(false);
    }, [pathname]);

    // … et avec la touche Échap.
    useEffect(() => {
        if (!drawerOpen) return;
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setDrawerOpen(false);
        }
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [drawerOpen]);

    return (
        <div className="flex min-h-screen bg-background">
            {/* Fond sombre derrière le tiroir (mobile) : un clic à côté le referme. */}
            {drawerOpen && (
                <div
                    aria-hidden
                    onClick={() => setDrawerOpen(false)}
                    className="fixed inset-0 z-40 bg-black/40 md:hidden"
                />
            )}

            <aside
                id="barre-laterale"
                aria-label="Navigation du portail"
                className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-outline-variant bg-surface-container-low transition-transform md:z-auto md:translate-x-0 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="flex items-start justify-between border-b border-outline-variant p-6">
                    <div>
                        <span className="text-xl font-bold text-primary">Bam&apos;S Market</span>
                        <p className="mt-1 text-xs text-on-surface-variant">{portalLabel}</p>
                    </div>
                    <button
                        onClick={() => setDrawerOpen(false)}
                        aria-label="Fermer le menu"
                        className="rounded-full p-1 text-on-surface-variant hover:bg-surface-variant/50 md:hidden"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="flex flex-col gap-1">
                        {navItems.map(({ icon: Icon, label, href }) => {
                            const active = href === activeHref;
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${active
                                                ? "border-r-4 border-primary bg-surface-variant/20 font-bold text-primary"
                                                : "text-on-surface-variant hover:bg-surface-variant/50"
                                            }`}
                                    >
                                        <Icon size={20} />
                                        {label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="flex flex-col gap-1 border-t border-outline-variant p-4">
                    <Link
                        href="/"
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-variant/50"
                    >
                        <Store size={20} />
                        Retour à la boutique
                    </Link>
                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-variant/50"
                    >
                        <LogOut size={20} />
                        Déconnexion
                    </button>
                </div>
            </aside>

            {/* min-w-0 : un tableau large défile dans son conteneur au lieu d'élargir toute la page. */}
            <div className="flex min-w-0 flex-1 flex-col md:ml-64">
                <header className="fixed top-0 z-30 flex h-16 w-full items-center justify-between gap-2 border-b border-outline-variant bg-surface px-4 shadow-sm md:w-[calc(100%-16rem)] md:px-6">
                    <div className="flex min-w-0 items-center gap-2">
                        <button
                            onClick={() => setDrawerOpen(true)}
                            aria-label="Ouvrir le menu"
                            aria-expanded={drawerOpen}
                            aria-controls="barre-laterale"
                            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low md:hidden"
                        >
                            <Menu size={22} />
                        </button>
                        <span className="truncate text-lg font-bold text-primary">{title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button aria-label="Notifications" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low">
                            <Bell size={20} />
                        </button>
                        {user && (
                            <Avatar name={`${user.firstName} ${user.lastName}`} role={user.role} size={36} />
                        )}
                    </div>
                </header>

                <main className="mt-16 min-w-0 flex-1 p-4 sm:p-6 md:p-8">
                    <VerificationBanner />
                    <div className="mx-auto max-w-7xl">{children}</div>
                </main>
            </div>
        </div>
    );
}
