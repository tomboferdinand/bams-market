import { Store, MapPin, Clock } from "lucide-react";
import type { Delivery } from "@/types/delivery";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

interface Props {
  delivery: Delivery;
  action?: React.ReactNode;
}

export function MissionCard({ delivery, action }: Props) {
  const { order } = delivery;
  const shop = order.items[0]?.product.shop;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant bg-surface-bright p-5">
        <p className="mb-1 text-xs text-on-surface-variant">Commande #CMD-{order.id}</p>
        <h3 className="mb-1 text-lg font-bold text-on-background">{shop?.name ?? "Boutique"}</h3>
        <p className="flex items-center gap-1 text-xs text-outline">
          <Clock size={14} />
          {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="relative pl-6">
          <div className="absolute bottom-3 left-2.5 top-3 w-0.5 bg-outline-variant" />
          <div className="relative mb-4">
            <div className="absolute -left-6 top-0.5 z-10 h-3 w-3 rounded-full border-2 border-primary bg-surface-container-lowest" />
            <p className="text-xs uppercase text-on-surface-variant">Point de retrait</p>
            <p className="flex items-center gap-1 font-medium text-on-background">
              <Store size={14} /> {shop?.name} — {shop?.address}
            </p>
          </div>
          <div className="relative">
            <div className="absolute -left-6 top-0.5 z-10 h-3 w-3 rounded-full bg-secondary-container shadow-[0_0_0_2px_#ffffff]" />
            <p className="text-xs uppercase text-on-surface-variant">
              {order.address.fullAddress ? "Destination" : "Zone de livraison"}
            </p>
            <p className="flex items-center gap-1 font-medium text-on-background">
              <MapPin size={14} />{" "}
              {order.address.fullAddress ?? [order.address.label, order.address.city].filter(Boolean).join(" — ")}
            </p>
            {!order.address.fullAddress && (
              <p className="mt-1 text-xs text-on-surface-variant">L'adresse exacte et le contact du client s'affichent après acceptation.</p>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-surface-variant pt-4">
          <div>
            <p className="text-xs text-on-surface-variant">Valeur de la commande</p>
            <p className="text-lg font-semibold text-primary">{fmt(order.total)} MGA</p>
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}
