import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/format";
import { AUDIT_ACTION_LABEL, auditToneValue, describeAuditDetails, maskAuditPhone } from "./audit-labels";

const d = (action: string, previousValue: string | null, newValue: string | null) =>
  describeAuditDetails({ action, previousValue, newValue });

describe("Journal d'activité : libellés français", () => {
  it("changement de rôle", () => {
    expect(d("USER_ROLE_CHANGED", "CLIENT", "LIVREUR")).toBe("Rôle modifié : Client → Livreur");
  });
  it("demandes de rôle : statut et rôle demandés, sans code technique", () => {
    expect(d("ROLE_REQUESTED", "AUCUN", "EN_ATTENTE:COMMERCANT")).toBe("— → En attente (Commerçant)");
    expect(d("ROLE_REQUEST_APPROVED", "EN_ATTENTE", "A_ACTIVER:LIVREUR")).toBe("En attente → Lien d'activation envoyé (Livreur)");
    expect(d("ROLE_REQUEST_ACTIVATED", "A_ACTIVER", "APPROUVEE")).toBe("Lien d'activation envoyé → Approuvée");
    expect(d("ROLE_REQUEST_REJECTED", "EN_ATTENTE", "REFUSEE")).toBe("En attente → Refusée");
  });
  it("retrait demandé : montant débité et numéro masqué", () => {
    expect(d("PAYOUT_REQUESTED", "AUCUN", "EN_ATTENTE:1836:0328019162"))
      .toBe(`Retrait demandé : ${formatPrice(1836)} MGA débités vers 032•••62`);
  });
  it("statut d'un retrait", () => {
    expect(d("PAYOUT_STATUS_CHANGE", "EN_ATTENTE", "REUSSI")).toBe("En attente → Réussi");
    expect(d("PAYOUT_STATUS_CHANGE", "EN_ATTENTE", "ECHOUE")).toBe("En attente → Échoué");
  });
  it("numéro de retrait modifié : les numéros complets n'apparaissent jamais", () => {
    const text = d("PAYOUT_PHONE_CHANGED", "0341234567", "0329876543 (motif : perte du téléphone)");
    expect(text).toBe("034•••67 → 032•••43 (motif : perte du téléphone)");
    expect(text).not.toMatch(/\d{10}/);
  });
  it("blocage des retraits, mot de passe, remboursement", () => {
    expect(d("PAYOUT_AUTH_LOCKED", "ACTIF", "BLOQUE_15_MIN")).toBe("Trop d'erreurs de mot de passe : retraits bloqués 15 min");
    expect(d("PASSWORD_RESET", null, "MOT_DE_PASSE_REINITIALISE")).toBe("Mot de passe réinitialisé par l'utilisateur");
    expect(d("ORDER_REFUND", null, "17000 MGA (réf. REF-1)")).toBe("Remboursé : 17000 MGA (réf. REF-1)");
  });
  it("statuts classiques : inchangés", () => {
    expect(d("SHOP_STATUS_CHANGE", "EN_ATTENTE_VALIDATION", "VALIDEE")).toBe("En attente de validation → Validée");
  });
  it("chaque action enregistrée par le backend a un libellé", () => {
    for (const code of ["USER_ROLE_CHANGED", "ROLE_REQUEST_APPROVED", "ROLE_REQUEST_ACTIVATED", "PAYOUT_REQUESTED", "PAYOUT_STATUS_CHANGE", "ORDER_REFUND"]) {
      expect(AUDIT_ACTION_LABEL[code]).toBeTruthy();
    }
  });
  it("action inconnue : on retombe sur les valeurs, sans planter", () => {
    expect(d("NOUVELLE_ACTION", null, "X")).toBe("— → X");
  });
  it("couleur de l'étiquette", () => {
    expect(auditToneValue({ action: "PAYOUT_STATUS_CHANGE", newValue: "REUSSI" })).toBe("VALIDEE");
    expect(auditToneValue({ action: "PAYOUT_STATUS_CHANGE", newValue: "ECHOUE" })).toBe("ECHOUEE");
    expect(auditToneValue({ action: "PAYOUT_REQUESTED", newValue: "EN_ATTENTE:1836:0328019162" })).toBe("EN_ATTENTE");
  });
  it("masquage d'un numéro", () => {
    expect(maskAuditPhone("0328019162")).toBe("032•••62");
  });
});

describe("Journal : anomalies de retrait", () => {
  it("libellés lisibles et couleur d'alerte", () => {
    expect(AUDIT_ACTION_LABEL.PAYOUT_ANOMALY).toBe("Anomalie de retrait");
    expect(describeAuditDetails({ action: "PAYOUT_ANOMALY", previousValue: "ECHOUE", newValue: "REUSSI_APRES_RECREDIT" }))
      .toBe("Retrait confirmé par GoalPay après avoir été recrédité : à régulariser");
    expect(describeAuditDetails({ action: "PAYOUT_ANOMALY", previousValue: "EN_ATTENTE", newValue: "ANOMALIE_MONTANT" }))
      .toContain("non réglé");
    expect(auditToneValue({ action: "PAYOUT_ANOMALY", newValue: "ANOMALIE_MONTANT" })).toBe("SUSPENDU");
  });
});
