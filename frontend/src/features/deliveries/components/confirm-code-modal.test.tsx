import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmCodeModal } from "./confirm-code-modal";

function setup(onConfirm = vi.fn().mockResolvedValue(undefined), open = true) {
  const onClose = vi.fn();
  render(<ConfirmCodeModal open={open} onClose={onClose} onConfirm={onConfirm} />);
  return { onConfirm, onClose, input: () => screen.getByPlaceholderText("123456") as HTMLInputElement };
}

describe("ConfirmCodeModal", () => {
  it("n'affiche rien quand il est fermé", () => {
    setup(undefined, false);
    expect(screen.queryByText("Confirmer la livraison")).not.toBeInTheDocument();
  });

  it("ne garde que les chiffres, 6 au maximum", async () => {
    const { input } = setup();
    await userEvent.type(input(), "12a34b56789");
    expect(input().value).toBe("123456");
  });

  it("refuse un code de moins de 6 chiffres sans appeler l'API", async () => {
    const { onConfirm, input } = setup();
    await userEvent.type(input(), "123");
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(screen.getByText("Le code doit contenir 6 chiffres.")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("envoie le code à 6 chiffres", async () => {
    const { onConfirm, input } = setup();
    await userEvent.type(input(), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirm).toHaveBeenCalledWith("123456");
  });

  it("affiche le message d'erreur renvoyé par l'API", async () => {
    const { input } = setup(vi.fn().mockRejectedValue(new Error("Code de confirmation incorrect.")));
    await userEvent.type(input(), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(await screen.findByText("Code de confirmation incorrect.")).toBeInTheDocument();
  });

  it("appelle onClose via Annuler", async () => {
    const { onClose } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
