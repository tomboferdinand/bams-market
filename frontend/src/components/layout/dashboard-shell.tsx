"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LogOut, Bell, Store } from "lucide-react";
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

    return (
        <div className="flex min-h-screen bg-background">
            <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-outline-variant bg-surface-container-low">
                <div className="border-b border-outline-variant p-6">
                    <span className="text-xl font-bold text-primary">Bam&apos;S Market</span>
                    <p className="mt-1 text-xs text-on-surface-variant">{portalLabel}</p>
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

            <div className="ml-64 flex flex-1 flex-col">
                <header className="fixed top-0 z-30 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-outline-variant bg-surface px-6 shadow-sm">
                    <span className="text-lg font-bold text-primary">{title}</span>
                    <div className="flex items-center gap-4">
                        <button aria-label="Notifications" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low">
                            <Bell size={20} />
                        </button>
                        {user && (
                            <Avatar name={`${user.firstName} ${user.lastName}`} role={user.role} size={36} />
                        )}
                    </div>
                </header>

                <main className="mt-16 flex-1 p-6 md:p-8">
                    <VerificationBanner />
                    <div className="mx-auto max-w-7xl">{children}</div>
                </main>
            </div>
        </div>
    );
}
