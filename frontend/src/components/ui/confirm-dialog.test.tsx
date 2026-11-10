import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./confirm-dialog";

function setup(open = true) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open={open}
      title="Vider le panier ?"
      description="Tous les articles seront retirés."
      confirmLabel="Vider"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("n'affiche rien quand il est fermé", () => {
    setup(false);
    expect(screen.queryByText("Vider le panier ?")).not.toBeInTheDocument();
  });

  it("affiche titre, description et boutons quand il est ouvert", () => {
    setup();
    expect(screen.getByText("Vider le panier ?")).toBeInTheDocument();
    expect(screen.getByText("Tous les articles seront retirés.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vider" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });

  it("appelle onConfirm au clic sur le bouton de confirmation", async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Vider" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("appelle onCancel au clic sur Annuler", async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
