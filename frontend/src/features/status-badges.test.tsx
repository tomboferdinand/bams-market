import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { PaymentStatusBadge } from "@/features/admin/components/payment-status-badge";
import { ProductStatusBadge } from "@/features/products/components/product-status-badge";
import { ShopStatusBadge } from "@/features/shops/components/shop-status-badge";

describe("OrderStatusBadge", () => {
  it.each([
    ["EN_ATTENTE_PAIEMENT", "En attente de paiement"],
    ["PAYEE", "Payée"],
    ["EN_PREPARATION", "En préparation"],
    ["EN_COURS_DE_LIVRAISON", "En cours de livraison"],
    ["LIVREE", "Livrée"],
    ["ANNULEE", "Annulée"],
    ["ECHOUEE", "Échouée"],
  ] as const)("affiche %s → %s", (status, label) => {
    render(<OrderStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("PaymentStatusBadge", () => {
  it("affiche « Non initié » sans paiement", () => {
    render(<PaymentStatusBadge status={null} />);
    expect(screen.getByText("Non initié")).toBeInTheDocument();
  });
  it.each([
    ["EN_ATTENTE", "En attente"],
    ["VALIDEE", "Confirmé"],
    ["ECHOUEE", "Échoué"],
    ["EXPIREE", "Expiré"],
  ] as const)("affiche %s → %s", (status, label) => {
    render(<PaymentStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("ProductStatusBadge", () => {
  it("« Désactivé » si le produit est inactif (prioritaire sur la rupture)", () => {
    render(<ProductStatusBadge product={{ isActive: false, status: "RUPTURE_DE_STOCK" } as never} />);
    expect(screen.getByText("Désactivé")).toBeInTheDocument();
  });
  it("« Rupture » si actif et en rupture de stock", () => {
    render(<ProductStatusBadge product={{ isActive: true, status: "RUPTURE_DE_STOCK" } as never} />);
    expect(screen.getByText("Rupture")).toBeInTheDocument();
  });
  it("« Actif » sinon", () => {
    render(<ProductStatusBadge product={{ isActive: true, status: "DISPONIBLE" } as never} />);
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });
});

describe("ShopStatusBadge", () => {
  it.each([
    ["VALIDEE", "Boutique Validée"],
    ["EN_ATTENTE_VALIDATION", "En attente de validation"],
    ["SUSPENDUE", "Boutique suspendue"],
    ["INACTIVE", "Boutique inactive"],
  ] as const)("affiche %s → %s", (status, label) => {
    render(<ShopStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
