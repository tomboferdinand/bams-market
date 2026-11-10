"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { LIVREUR_NAV } from "@/features/dashboard/nav-items";
import { useRequireRole } from "@/features/auth/hooks/use-require-role";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/data-states";
import { MissionCard } from "@/features/deliveries/components/mission-card";
import { getAvailableMissions, acceptMission } from "@/services/deliveries.service";
import { ApiError } from "@/services/api";
import type { Delivery } from "@/types/delivery";

export default function MissionsPage() {
  const { loading: authLoading } = useRequireRole(["LIVREUR"]);
  const [missions, setMissions] = useState<Delivery[] | null>(null);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function load() {
    getAvailableMissions().then(setMissions).catch(() => setError(true));
  }
  useEffect(load, []);

  async function handleAccept(id: number) {
    setActionError(null);
    try {
      await acceptMission(id);
      setMissions((prev) => prev!.filter((m) => m.id !== id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    }
  }

  if (authLoading) return null;

  return (
    <DashboardShell title="Missions disponibles" portalLabel="Espace Livreur" navItems={LIVREUR_NAV} activeHref="/livreur/missions">
      <h2 className="text-2xl font-bold text-on-background">Missions disponibles</h2>
      <p className="mt-1 text-on-surface-variant">{missions?.length ?? 0} mission{(missions?.length ?? 0) > 1 ? "s" : ""} en attente</p>

      {actionError && <p className="mt-4 text-sm text-error">{actionError}</p>}

      {error && <ErrorState label="Impossible de charger les missions." />}
      {!error && missions === null && <LoadingState label="Chargement..." />}
      {!error && missions !== null && missions.length === 0 && <EmptyState label="Aucune mission disponible pour le moment." />}

      {missions && missions.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-gutter lg:grid-cols-2 xl:grid-cols-3">
          {missions.map((m) => (
            <MissionCard
              key={m.id}
              delivery={m}
              action={
                <button
                  onClick={() => handleAccept(m.id)}
                  className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container"
                >
                  Accepter
                </button>
              }
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}