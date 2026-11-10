import type { PaymentStatus } from "@/types/payment";
import { PAYMENT_STATUS_LABEL } from "../labels";

const CLASS: Record<PaymentStatus, string> = {
  EN_ATTENTE: "bg-secondary-container/20 text-secondary",
  VALIDEE: "bg-primary-container/10 text-primary",
  ECHOUEE: "bg-error-container text-on-error-container",
  EXPIREE: "bg-surface-variant text-on-surface-variant",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus | null }) {
  if (!status) return <span className="text-xs italic text-on-surface-variant">Non initié</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${CLASS[status]}`}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}