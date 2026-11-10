import { describe, it, expect } from "vitest";
import { ACCOUNT_LINK, accountLinkFor } from "./account-menu";

describe("account-menu", () => {
  it("donne à chaque rôle son entrée de menu et sa destination", () => {
    expect(accountLinkFor("CLIENT")).toEqual({ href: "/profil", label: "Mon compte" });
    expect(accountLinkFor("COMMERCANT")).toEqual({ href: "/commercant/dashboard", label: "Mon espace commerçant" });
    expect(accountLinkFor("LIVREUR")).toEqual({ href: "/livreur/dashboard", label: "Mon espace livreur" });
    expect(accountLinkFor("ADMINISTRATEUR")).toEqual({ href: "/admin/dashboard", label: "Administration" });
  });

  it("chaque rôle a une destination distincte, dans son propre espace", () => {
    const hrefs = Object.values(ACCOUNT_LINK).map((l) => l.href);
    expect(new Set(hrefs).size).toBe(4);
    expect(ACCOUNT_LINK.COMMERCANT.href.startsWith("/commercant/")).toBe(true);
    expect(ACCOUNT_LINK.LIVREUR.href.startsWith("/livreur/")).toBe(true);
    expect(ACCOUNT_LINK.ADMINISTRATEUR.href.startsWith("/admin/")).toBe(true);
  });
});
