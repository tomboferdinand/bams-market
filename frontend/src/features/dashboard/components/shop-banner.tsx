import Link from "next/link";
import type { ReactNode } from "react";
import { Info, AlertCircle } from "lucide-react";
import type { Shop } from "@/types/shop";

function Banner({ tone, children }: { tone: "warning" | "error"; children: ReactNode }) {
  const isError = tone === "error";
  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-lg border p-4 shadow-sm ${
        isError
          ? "border-error/30 bg-error-container text-on-error-container"
          : "border-secondary-fixed-dim bg-secondary-fixed text-on-secondary-fixed"
      }`}
    >
      {isError ? (
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-error" />
      ) : (
        <Info size={20} className="mt-0.5 shrink-0 text-secondary" />
      )}
      <p className="text-sm">{children}</p>
    </div>
  );
}

export function ShopBanner({ shop }: { shop: Shop | null }) {
  if (!shop) {
    return (
      <Banner tone="warning">
        Votre boutique n&apos;a pas encore été créée.{" "}
        <Link href="/commercant/boutique" className="font-semibold underline">
          Créez-la
        </Link>{" "}
        pour commencer à vendre sur Bam&apos;S Market.
      </Banner>
    );
  }

  switch (shop.status) {
    case "EN_ATTENTE_VALIDATION":
      return (
        <Banner tone="warning">
          Votre boutique est en attente de validation par l&apos;administrateur. Vous ne pourrez ajouter des produits et vendre qu&apos;une fois celle-ci validée.
        </Banner>
      );
    case "SUSPENDUE":
      return (
        <Banner tone="error">
          Votre boutique est suspendue : ses produits ne sont plus visibles dans le catalogue. Contactez l&apos;administrateur.
        </Banner>
      );
    case "INACTIVE":
      return (
        <Banner tone="error">
          Votre boutique est inactive (demande refusée ou désactivée) et ne peut pas vendre. Contactez l&apos;administrateur.
        </Banner>
      );
    default:
      return null; // VALIDEE : aucun bandeau
  }
}