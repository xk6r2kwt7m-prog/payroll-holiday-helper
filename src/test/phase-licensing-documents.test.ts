import { describe, it, expect } from "vitest";
import {
  awaitingConfirmation, buildDpsAuthorisation, buildSection57,
  buildStaffAlcoholAuthorisation, canSignRequest, clampExpiryDays, isReadyToSend,
  isRequestLocked, mayReachSignatureStep, requestStatusLabel, requestStatusTone,
  resolveRequestStatus, SUBJECT_LABELS, type LicenceSite,
} from "@/lib/licensing-documents";

const fitzrovia: LicenceSite = {
  branch: "Fitzrovia",
  premises_name: "UD Fitzrovia",
  premises_address: "30 Rathbone Place, London, W1T 1JQ",
  licence_number: "21/05993/LIPN",
  licence_holder: "UD Restaurants Limited",
  issuing_authority: "City of Westminster Council",
  dps_name: "Philipp Chaykin",
  dps_personal_licence_number: "17/05171/LIPERS",
};

const carnaby: LicenceSite = { branch: "Carnaby", dps_name: "Philipp Chaykin" };

describe("licence site confirmation", () => {
  it("reports nothing outstanding for a fully recorded site", () => {
    expect(awaitingConfirmation(fitzrovia)).toEqual([]);
    expect(isReadyToSend(fitzrovia, "dps_authorisation")).toBe(true);
    expect(isReadyToSend(fitzrovia, "section_57")).toBe(true);
    expect(isReadyToSend(fitzrovia, "staff_alcohol")).toBe(true);
  });

  it("names every unconfirmed field for a new site", () => {
    const missing = awaitingConfirmation(carnaby);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.join(" ")).toMatch(/licence number/i);
    expect(isReadyToSend(carnaby, "dps_authorisation")).toBe(false);
  });

  it("never invents a licence number", () => {
    const doc = buildDpsAuthorisation(carnaby, "2026-09-16");
    const licenceFact = doc.facts.find((f) => /licence number/i.test(f.label));
    expect(licenceFact?.value).not.toMatch(/21\/05993/);
    expect(licenceFact?.value).toMatch(/_+/);
  });
});

describe("generated documents", () => {
  it("builds a DPS authorisation naming the DPS and their personal licence", () => {
    const doc = buildDpsAuthorisation(fitzrovia, "2026-09-16");
    const text = JSON.stringify(doc);
    expect(doc.subject_type).toBe("dps_authorisation");
    expect(text).toContain("Philipp Chaykin");
    expect(text).toContain("17/05171/LIPERS");
    expect(text).toContain("UD Fitzrovia");
  });

  it("treats the company as the premises licence holder in a Section 57 notice", () => {
    const doc = buildSection57(
      fitzrovia,
      [{ name: "Aderito Barros", job_title: "Operations Manager" }],
      "2026-09-16"
    );
    const signedOnBehalf = doc.signature_block.find((f) => /on behalf of/i.test(f.label));
    expect(signedOnBehalf?.value).toBe("UD Restaurants Limited");
    expect(doc.paragraphs.join(" ")).toContain("premises licence holder for");
    expect(doc.paragraphs.join(" ")).toContain("is UD Restaurants Limited");
    expect(JSON.stringify(doc)).not.toMatch(/Philipp Chaykin[^"]*is the premises licence holder/i);
    expect(doc.nominated?.[0].name).toBe("Aderito Barros");
  });

  it("gives staff the Challenge 25 and refusal wording", () => {
    const doc = buildStaffAlcoholAuthorisation(fitzrovia, "Ana Silva", "2026-09-16");
    const text = JSON.stringify(doc);
    expect(text).toMatch(/Challenge 25/i);
    expect(text).toContain("Ana Silva");
    expect(doc.statement).toBeTruthy();
  });

  it("labels all three document types", () => {
    expect(Object.keys(SUBJECT_LABELS).sort()).toEqual(
      ["dps_authorisation", "section_57", "staff_alcohol"]
    );
  });
});

describe("signature request rules", () => {
  const base = {
    status: "sent", read_at: null, signed_at: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  };

  it("requires the document to be read before signing", () => {
    expect(mayReachSignatureStep(base)).toBe(false);
    expect(mayReachSignatureStep({ ...base, read_at: new Date().toISOString() })).toBe(true);
  });

  it("keeps the link open when the reader is not ready to sign", () => {
    const declined = { ...base, status: "declined", read_at: new Date().toISOString() };
    expect(canSignRequest(declined)).toBe(true);
    expect(resolveRequestStatus(declined)).toBe("declined");
  });

  it("locks a signed document against further signing", () => {
    const signed = { ...base, status: "signed", signed_at: new Date().toISOString() };
    expect(isRequestLocked(signed)).toBe(true);
    expect(canSignRequest(signed)).toBe(false);
    expect(resolveRequestStatus(signed)).toBe("signed");
  });

  it("treats an unsigned expired link as expired", () => {
    const expired = { ...base, expires_at: new Date(Date.now() - 1000).toISOString() };
    expect(resolveRequestStatus(expired)).toBe("expired");
    expect(canSignRequest(expired)).toBe(false);
  });

  it("still shows a signed document that expired afterwards as signed", () => {
    const signed = {
      ...base, status: "signed", signed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    expect(resolveRequestStatus(signed)).toBe("signed");
  });

  it("gives every status a plain-English label and tone", () => {
    (["sent", "viewed", "read", "signed", "declined", "expired", "cancelled"] as const).forEach((s) => {
      expect(requestStatusLabel(s).length).toBeGreaterThan(0);
      expect(["green", "amber", "red", "grey"]).toContain(requestStatusTone(s));
    });
  });

  it("keeps the link lifetime within sensible limits", () => {
    expect(clampExpiryDays(0)).toBeGreaterThanOrEqual(1);
    expect(clampExpiryDays(500)).toBeLessThanOrEqual(90);
    expect(clampExpiryDays(30)).toBe(30);
  });
});

describe("incident log condition source per branch", () => {
  it("names each site's own licence condition", () => {
    expect(incidentLogConditionSource("Fitzrovia")).toContain("condition 28");
    expect(incidentLogConditionSource("Brixton")).toContain("condition 13");
  });

  it("keeps the requirement but says so when a site's licence is unconfirmed", () => {
    expect(incidentLogConditionSource("Carnaby")).toContain("not yet confirmed");
    expect(requiresLicenceRecord("alcohol_refusal")).toBe(true);
  });
});
