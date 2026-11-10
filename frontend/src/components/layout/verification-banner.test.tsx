import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { EMAIL_NOT_VERIFIED_EVENT } from "@/services/api";
import { VerificationBanner } from "./verification-banner";

const auth = vi.hoisted(() => ({ user: null as any, setUser: vi.fn() }));
const svc = vi.hoisted(() => ({ resend: vi.fn(), current: vi.fn() }));

vi.mock("@/features/auth/auth-context", () => ({ useAuth: () => ({ user: auth.user, setUser: auth.setUser }) }));
vi.mock("@/services/auth.service", () => ({
  resendVerificationEmail: svc.resend,
  getCurrentUser: svc.current,
}));

const unverified = { id: 5, email: "jean.dupont@gmail.com", verificationStatus: "NON_VERIFIE" };

describe("VerificationBanner (fenêtre de vérification de l'e-mail)", () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    auth.user = unverified;
    auth.setUser.mockReset();
    svc.resend.mockReset();
    svc.current.mockReset();
  });

  it("s'affiche pour un compte non vérifié, avec l'adresse masquée", async () => {
    render(<VerificationBanner />);
    expect(await screen.findByText("Vérifiez votre adresse e-mail")).toBeTruthy();
    expect(screen.getByText("je••••••@gmail.com")).toBeTruthy();
  });

  it("ne s'affiche pas si l'e-mail est vérifié, absent, ou sans utilisateur", () => {
    auth.user = { ...unverified, verificationStatus: "VERIFIE" };
    const { unmount } = render(<VerificationBanner />);
    expect(screen.queryByText("Vérifiez votre adresse e-mail")).toBeNull();
    unmount();
    auth.user = { ...unverified, email: null };
    const second = render(<VerificationBanner />);
    expect(screen.queryByText("Vérifiez votre adresse e-mail")).toBeNull();
    second.unmount();
    auth.user = null;
    render(<VerificationBanner />);
    expect(screen.queryByText("Vérifiez votre adresse e-mail")).toBeNull();
  });

  it("« Plus tard » ferme la fenêtre pour la session", async () => {
    const { unmount } = render(<VerificationBanner />);
    fireEvent.click(await screen.findByText("Plus tard"));
    await waitFor(() => expect(screen.queryByText("Vérifiez votre adresse e-mail")).toBeNull());
    unmount();
    render(<VerificationBanner />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("Vérifiez votre adresse e-mail")).toBeNull();
  });

  it("renvoie l'e-mail, confirme l'envoi et bloque le bouton pendant le compte à rebours", async () => {
    svc.resend.mockResolvedValue(undefined);
    render(<VerificationBanner />);
    fireEvent.click(await screen.findByText("Renvoyer l'e-mail"));
    expect(await screen.findByText(/E-mail envoyé/)).toBeTruthy();
    expect(svc.resend).toHaveBeenCalledTimes(1);
    const button = await screen.findByText(/Renvoyer dans/);
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("affiche le message d'erreur du serveur", async () => {
    const { ApiError } = await vi.importActual<typeof import("@/services/api")>("@/services/api");
    svc.resend.mockRejectedValue(new ApiError("Trop de tentatives. Réessayez dans 10 min.", 429));
    render(<VerificationBanner />);
    fireEvent.click(await screen.findByText("Renvoyer l'e-mail"));
    expect(await screen.findByText("Trop de tentatives. Réessayez dans 10 min.")).toBeTruthy();
  });

  it("« J'ai confirmé » met à jour l'utilisateur quand l'e-mail est vérifié", async () => {
    const fresh = { ...unverified, verificationStatus: "VERIFIE" };
    svc.current.mockResolvedValue(fresh);
    render(<VerificationBanner />);
    fireEvent.click(await screen.findByText("J'ai confirmé mon e-mail"));
    expect(await screen.findByText("Adresse vérifiée")).toBeTruthy();
    expect(auth.setUser).toHaveBeenCalledWith(fresh);
  });

  it("« J'ai confirmé » prévient quand l'e-mail n'est pas encore vérifié", async () => {
    svc.current.mockResolvedValue(unverified);
    render(<VerificationBanner />);
    fireEvent.click(await screen.findByText("J'ai confirmé mon e-mail"));
    expect(await screen.findByText(/pas encore confirmée/)).toBeTruthy();
    expect(auth.setUser).not.toHaveBeenCalled();
  });

  it("se rouvre de force, avec une explication, quand une action exige un e-mail vérifié", async () => {
    const { unmount } = render(<VerificationBanner />);
    fireEvent.click(await screen.findByText("Plus tard"));
    await waitFor(() => expect(screen.queryByText("Vérifiez votre adresse e-mail")).toBeNull());
    act(() => {
      window.dispatchEvent(new Event(EMAIL_NOT_VERIFIED_EVENT));
    });
    expect(await screen.findByText("Vérifiez votre adresse e-mail")).toBeTruthy();
    expect(screen.getByText("Cette action nécessite une adresse e-mail vérifiée.")).toBeTruthy();
    unmount();
  });
});
