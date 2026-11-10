"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";
import { ROLE_HOME } from "@/lib/routes";
import type { Role } from "@/types/auth";

export function useRequireRole(allowed: Role[]) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace("/connexion");
            return;
        }

        if (!allowed.includes(user.role)) {
            router.replace(ROLE_HOME[user.role]); // renvoie chacun vers son propre espace
        }
    }, [user, loading, allowed, router]);

    return { user, loading };
}