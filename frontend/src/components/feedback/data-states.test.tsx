import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingState, EmptyState, ErrorState } from "./data-states";

describe("LoadingState", () => {
  it("affiche le libellé par défaut", () => {
    render(<LoadingState />);
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });
  it("affiche un libellé personnalisé", () => {
    render(<LoadingState label="Chargement du panier..." />);
    expect(screen.getByText("Chargement du panier...")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("affiche son message", () => {
    render(<EmptyState label="Aucune commande." />);
    expect(screen.getByText("Aucune commande.")).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("affiche son message d'erreur", () => {
    render(<ErrorState label="Cette commande n'a pas été payée." />);
    expect(screen.getByText("Cette commande n'a pas été payée.")).toBeInTheDocument();
  });
});
