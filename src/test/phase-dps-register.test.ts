import { describe, it, expect } from "vitest";
import {
  buildDpsRegister, registerSummary, registerSummaryLine, registerCsv, registerPdfRows,
  outstandingSignatureLine, clampLinkExpiryDays, deliveryMethodFor, linkState, canOpenLink,
  type RegisterAuthorisation, type RegisterEmployee,
  unclassifiedForSite,
} from "@/lib/dps-register";
import { belongsOnAlcoholList, needsRoleDecision } from "@/lib/alcohol-automation";

const emp = (over: Partial<RegisterEmployee> & { id: string }): RegisterEmployee => ({
  forename: "A", surname: "Person", department: "Front of House",
  status: "active", archived_at: null, is_test_record: false, branches: ["Carnaby"],
  ...over,
});

const auth = (over: Partial<RegisterAuthorisation> & { employee_id: string }): RegisterAuthorisation => ({
  branch: "Carnaby", status: "active", employee_signed_at: "2026-01-02T00:00:00Z",
  authoriser_confirmed_at: "2026-01-03T00:00:00Z", revoked_at: null,
  ...over,
} as RegisterAuthorisation);

describe("site register composition", () => {
  it("lists front-of-house staff at the site even with no record", () => {
    const rows = buildDpsRegister({
      branch: "Carnaby",
      employees: [emp({ id: "1", forename: "Ling", surname: "Chak" })],
      authorisations: [],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("awaiting_signature");
    expect(rows[0].listed_because).toBe("front_of_house");
  });

  it("never assumes anyone has signed", () => {
    const rows = buildDpsRegister({
      branch: "Carnaby", employees: [emp({ id: "1" })], authorisations: [],
    });
    expect(rows.every((r) => r.status !== "signed")).toBe(true);
  });

  it("excludes kitchen staff with no record", () => {
    const rows = buildDpsRegister({
      branch: "Carnaby",
      employees: [emp({ id: "1", department: "Kitchen" })],
      authorisations: [],
    });
    expect(rows).toHaveLength(0);
  });

  it("includes back-of-house staff who hold an authorisation", () => {
    const rows = buildDpsRegister({
      branch: "Carnaby",
      employees: [emp({ id: "1", department: "Kitchen" })],
      authorisations: [auth({ employee_id: "1" })],
    });
    expect(rows[0].status).toBe("signed");
    expect(rows[0].listed_because).toBe("authorisation_on_record");
  });

  it("counts a signed but not yet approved authorisation as signed", () => {
    const rows = buildDpsRegister({
      branch: "Carnaby",
      employees: [emp({ id: "1" })],
      authorisations: [auth({ employee_id: "1", status: "pending", authoriser_confirmed_at: null })],
    });
    expect(rows[0].status).toBe("signed");
  });

  it("marks unsigned requests as awaiting signature", () => {
    const rows = buildDpsRegister({
      branch: "Carnaby",
      employees: [emp({ id: "1" })],
      authorisations: [auth({
        employee_id: "1", status: "pending",
        employee_signed_at: null, authoriser_confirmed_at: null,
      })],
    });
    expect(rows[0].status).toBe("awaiting_signature");
  });

  it("keeps other sites out", () => {
    const rows = buildDpsRegister({
      branch: "Brixton", employees: [emp({ id: "1" })], authorisations: [],
    });
    expect(rows).toHaveLength(0);
  });

  it("never lists test records", () => {
    const rows = buildDpsRegister({
      branch: "Carnaby",
      employees: [emp({ id: "1", is_test_record: true })],
      authorisations: [auth({ employee_id: "1" })],
    });
    expect(rows).toHaveLength(0);
  });

  it("shows a leaver only while a record exists, flagged as no longer employed", () => {
    const leaver = emp({ id: "1", status: "leaver" });
    expect(buildDpsRegister({ branch: "Carnaby", employees: [leaver], authorisations: [] })).toHaveLength(0);
    const rows = buildDpsRegister({
      branch: "Carnaby", employees: [leaver], authorisations: [auth({ employee_id: "1" })],
    });
    expect(rows[0].no_longer_employed).toBe(true);
    expect(rows[0].status).not.toBe("signed");
  });

  it("sorts people who have signed first", () => {
    const rows = buildDpsRegister({
      branch: "Carnaby",
      employees: [emp({ id: "1", forename: "Zoe" }), emp({ id: "2", forename: "Amy" })],
      authorisations: [auth({ employee_id: "1" })],
    });
    expect(rows[0].name).toContain("Zoe");
  });
});

describe("summary and exports", () => {
  const rows = buildDpsRegister({
    branch: "Carnaby",
    employees: [emp({ id: "1", forename: "Amy" }), emp({ id: "2", forename: "Zoe" })],
    authorisations: [auth({ employee_id: "1" })],
  });

  it("counts the register", () => {
    const s = registerSummary(rows);
    expect(s.covered).toBe(2);
    expect(s.signed).toBe(1);
    expect(s.awaitingSignature).toBe(1);
    expect(s.noneSigned).toBe(false);
  });

  it("treats a missing staff signature as optional, not as a ban", () => {
    const none = buildDpsRegister({
      branch: "Carnaby", employees: [emp({ id: "1" })], authorisations: [],
    });
    expect(registerSummary(none).noneSigned).toBe(true);
    expect(registerSummaryLine(none, "Carnaby")).not.toMatch(/must not be sold/i);
    const note = outstandingSignatureLine(none, "Carnaby")!;
    expect(note).toMatch(/not required/i);
    expect(note).toMatch(/Designated Premises Supervisor/i);
    expect(outstandingSignatureLine(rows.filter((r) => r.status === "signed"), "Carnaby")).toBeNull();
  });

  it("states the count in plain English", () => {
    expect(registerSummaryLine(rows, "Carnaby")).toBe(
      "2 front-of-house staff are authorised to sell alcohol at Carnaby under the Designated Premises Supervisor's signature below (1 have also signed individually).",
    );
  });

  it("exports a CSV with a row per person", () => {
    const csv = registerCsv(rows, "Carnaby").split("\n");
    expect(csv[0]).toContain("Status");
    expect(csv).toHaveLength(3);
  });

  it("prints only what a licensing officer needs", () => {
    const printed = registerPdfRows(rows);
    expect(printed).toHaveLength(2);
    expect(printed.every((r) => !("status_label" in r))).toBe(true);
    expect(printed.find((r) => r.name.includes("Zoe"))?.signature).toBeNull();
  });
});

describe("issued copies", () => {
  it("keeps the link expiry within sensible limits", () => {
    expect(clampLinkExpiryDays(0)).toBe(1);
    expect(clampLinkExpiryDays(500)).toBe(90);
    expect(clampLinkExpiryDays("nonsense")).toBe(14);
  });

  it("names the delivery method chosen", () => {
    expect(deliveryMethodFor(true, true)).toBe("email_both");
    expect(deliveryMethodFor(false, true)).toBe("email_link");
    expect(deliveryMethodFor(true, false)).toBe("email_attachment");
  });

  it("only opens a link that is live", () => {
    const now = new Date("2026-02-01T00:00:00Z");
    expect(linkState({ access_token: null }, now)).toBe("no_link");
    expect(linkState({ access_token: "t", revoked_at: "2026-01-05T00:00:00Z" }, now)).toBe("revoked");
    expect(linkState({ access_token: "t", token_expires_at: "2026-01-05T00:00:00Z" }, now)).toBe("expired");
    expect(canOpenLink({ access_token: "t", token_expires_at: "2026-03-05T00:00:00Z" }, now)).toBe(true);
    expect(canOpenLink({ access_token: "t", revoked_at: "2026-01-05T00:00:00Z" }, now)).toBe(false);
  });
});

describe("unclear roles need a manager decision", () => {
  const unclear = emp({ id: "u1", forename: "Sam", surname: "Doubt", department: "" });

  it("keeps an unclear role off the list until decided, never as authorised", () => {
    const rows = buildDpsRegister({ branch: "Carnaby", employees: [unclear], authorisations: [] });
    expect(rows).toHaveLength(0);
    const pending = unclassifiedForSite({ branch: "Carnaby", employees: [unclear], authorisations: [] });
    expect(pending.map((p) => p.employee_id)).toEqual(["u1"]);
  });

  it("a manager decision adds them to the list and clears the decide group", () => {
    const decisions = [{ employee_id: "u1", branch: "Carnaby", decision: "front_of_house" as const }];
    const rows = buildDpsRegister({ branch: "Carnaby", employees: [unclear], authorisations: [], decisions });
    expect(rows).toHaveLength(1);
    expect(rows[0].listed_because).toBe("manager_added");
    expect(rows[0].status).toBe("awaiting_signature");
    expect(unclassifiedForSite({ branch: "Carnaby", employees: [unclear], authorisations: [], decisions })).toHaveLength(0);
  });

  it("a not-front-of-house decision keeps them off the list and out of the decide group", () => {
    const decisions = [{ employee_id: "u1", branch: "Carnaby", decision: "not_front_of_house" as const }];
    expect(buildDpsRegister({ branch: "Carnaby", employees: [unclear], authorisations: [], decisions })).toHaveLength(0);
    expect(unclassifiedForSite({ branch: "Carnaby", employees: [unclear], authorisations: [], decisions })).toHaveLength(0);
  });

  it("a decision does not override an existing authorisation record", () => {
    const decisions = [{ employee_id: "u1", branch: "Carnaby", decision: "not_front_of_house" as const }];
    const rows = buildDpsRegister({
      branch: "Carnaby", employees: [unclear], authorisations: [auth({ employee_id: "u1" })], decisions,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("signed");
  });

  it("the send list and the site list use the same rule", () => {
    const decisions = [{ employee_id: "u1", branch: "Carnaby", decision: "front_of_house" as const }];
    expect(belongsOnAlcoholList(unclear as any, "Carnaby", decisions)).toBe(true);
    expect(needsRoleDecision(unclear as any, "Carnaby", [])).toBe(true);
    expect(needsRoleDecision(unclear as any, "Carnaby", decisions)).toBe(false);
    expect(belongsOnAlcoholList(emp({ id: "k1", department: "Kitchen" }) as any, "Carnaby", [])).toBe(false);
  });
});
