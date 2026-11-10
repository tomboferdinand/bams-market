export type DeliveryStatus = "DISPONIBLE" | "EN_COURS" | "LIVREE" | "ECHEC";

interface DeliveryOrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  product: { id: number; name: string; shop: { id: number; name: string; address: string } };
}

interface DeliveryOrder {
  id: number;
  total: number;
  createdAt: string;
  // BR-SEC-06 : avant d'accepter la mission, seuls label et city sont fournis.
  // L'adresse exacte et le téléphone n'arrivent qu'après acceptation.
  address: { label: string; city?: string; fullAddress?: string; phone?: string };
  items: DeliveryOrderItem[];
  user: { firstName: string; lastName?: string; phone?: string };
}

export interface Delivery {
  id: number;
  orderId: number;
  livreurId: number | null;
  status: DeliveryStatus;
  acceptedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  order: DeliveryOrder;
}
