import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  selectInductionDocuments,
  summariseSelection,
  documentAppliesToBranch,
  documentAppliesToRole,
  isDocumentActive,
  type SelectableDocument,
} from "@/lib/induction-pack-selection";
import {
  resolveExpiryBand,
  expiryTone,
  reminderDueToday,
  daysUntil,
} from "@/lib/compliance-expiry";
import {
  resolveAuthorisationStatus,
  isAuthorisedToSellAlcohol,
  canApproveAuthorisation,
  latestAuthorisation,
} from "@/lib/alcohol-authorisation-status";
import {
  summariseInspectionReadiness,
  checklistTone,
  documentTone,
  DEFAULT_INSPECTION_CHECKLIST,
} from "@/lib/inspection-readiness";
import { suggestStaffRole, roleMaySellAlcohol } from "@/lib/compliance-taxonomy";

const TODAY = new Date("2026-09-16T12:00:00Z");

function doc(over: Partial<SelectableDocument> = {}): SelectableDocument {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    name: "Doc",
    category: "Staff induction",
    version: 1,
    status: "active",
    include_in_induction: true,
    requires_signature: false,
    alcohol_related: false,
    applies_to_all_branches: true,
    branches: [],
    applies_to_all_roles: true,
    roles: [],
    expires_at: null,
    archived_at: null,
    ...over,
  };
}

describe("induction pack selection", () => {
  it("includes company-wide active documents", () => {
    const picked = selectInductionDocuments({ documents: [doc({ name: "Company induction" })], branch: "Carnaby", role: "Front of House" }, TODAY);
    expect(picked.map((d) => d.name)).toEqual(["Company induction"]);
  });

  it("matches branch-specific documents only for that branch", () => {
    const d = doc({ name: "Carnaby H&S", applies_to_all_branches: false, branches: ["Carnaby"] });
    expect(documentAppliesToBranch(d, "Carnaby")).toBe(true);
    expect(documentAppliesToBranch(d, "Brixton")).toBe(false);
    expect(selectInductionDocuments({ documents: [d], branch: "Brixton", role: "Kitchen" }, TODAY)).toHaveLength(0);
  });

  it("matches role-specific documents only for that role", () => {
    const d = doc({ name: "FOH food safety", applies_to_all_roles: false, roles: ["Front of House"] });
    expect(documentAppliesToRole(d, "Front of House")).toBe(true);
    expect(documentAppliesToRole(d, "Kitchen")).toBe(false);
  });

  it("excludes archived, non-active and expired documents", () => {
    expect(isDocumentActive(doc({ status: "archived" }), TODAY)).toBe(false);
    expect(isDocumentActive(doc({ archived_at: "2026-01-01" }), TODAY)).toBe(false);
    expect(isDocumentActive(doc({ expires_at: "2026-01-01" }), TODAY)).toBe(false);
    expect(isDocumentActive(doc({ expires_at: "2027-01-01" }), TODAY)).toBe(true);
  });

  it("only includes alcohol documents when alcohol sales apply", () => {
    const docs = [doc({ name: "Induction" }), doc({ name: "Challenge 25", alcohol_related: true })];
    expect(selectInductionDocuments({ documents: docs, branch: "Carnaby", role: "Front of House" }, TODAY)).toHaveLength(1);
    expect(
      selectInductionDocuments({ documents: docs, branch: "Carnaby", role: "Front of House", includeAlcohol: true }, TODAY)
    ).toHaveLength(2);
  });

  it("ignores documents not flagged for induction", () => {
    expect(selectInductionDocuments({ documents: [doc({ include_in_induction: false })] }, TODAY)).toHaveLength(0);
  });

  it("summarises the count in plain English", () => {
    expect(summariseSelection(0)).toMatch(/No documents/);
    expect(summariseSelection(1)).toBe("1 document selected automatically");
    expect(summariseSelection(12)).toBe("12 documents selected automatically");
  });
});

describe("role suggestion", () => {
  it("maps departments to role buckets", () => {
    expect(suggestStaffRole("Front of House", "Waiter")).toBe("Front of House");
    expect(suggestStaffRole("Kitchen", "Chef de partie")).toBe("Kitchen");
    expect(suggestStaffRole(null, "Shift Supervisor")).toBe("Supervisor");
    expect(suggestStaffRole(null, "Operations Manager")).toBe("Manager");
    expect(suggestStaffRole(null, null)).toBeNull();
  });

  it("knows which roles may sell alcohol", () => {
    expect(roleMaySellAlcohol("Front of House")).toBe(true);
    expect(roleMaySellAlcohol("Kitchen")).toBe(false);
  });
});

describe("expiry bands and reminders", () => {
  it("bands by days remaining", () => {
    expect(resolveExpiryBand("2026-09-15", TODAY)).toBe("expired");
    expect(resolveExpiryBand("2026-09-30", TODAY)).toBe("30_days");
    expect(resolveExpiryBand("2026-11-01", TODAY)).toBe("60_days");
    expect(resolveExpiryBand("2026-12-01", TODAY)).toBe("90_days");
    expect(resolveExpiryBand("2027-06-01", TODAY)).toBe("ok");
    expect(resolveExpiryBand(null, TODAY)).toBe("none");
  });

  it("colours the band", () => {
    expect(expiryTone("expired")).toBe("red");
    expect(expiryTone("30_days")).toBe("amber");
    expect(expiryTone("ok")).toBe("green");
    expect(expiryTone("none")).toBe("grey");
  });

  it("fires reminders at 90, 60, 30 and 0 days only", () => {
    const at = (d: number) => {
      const t = new Date(TODAY);
      t.setDate(t.getDate() + d);
      return t.toISOString().slice(0, 10);
    };
    expect(daysUntil(at(90), TODAY)).toBe(90);
    expect(reminderDueToday(at(90), TODAY)).toBe(90);
    expect(reminderDueToday(at(60), TODAY)).toBe(60);
    expect(reminderDueToday(at(30), TODAY)).toBe(30);
    expect(reminderDueToday(at(0), TODAY)).toBe(0);
    expect(reminderDueToday(at(45), TODAY)).toBeNull();
    expect(reminderDueToday(at(-5), TODAY)).toBeNull();
  });
});

describe("alcohol authorisation", () => {
  const base = {
    id: "a1",
    employee_id: "e1",
    status: "active",
    employee_signed_at: "2026-09-01",
    authoriser_confirmed_at: "2026-09-02",
  };

  it("is active only when both parties signed", () => {
    expect(resolveAuthorisationStatus(base)).toBe("active");
    expect(resolveAuthorisationStatus({ ...base, authoriser_confirmed_at: null })).toBe("pending");
    expect(isAuthorisedToSellAlcohol(base)).toBe(true);
  });

  it("revokes automatically when the employee leaves", () => {
    expect(resolveAuthorisationStatus(base, { status: "leaver" })).toBe("revoked");
    expect(resolveAuthorisationStatus(base, { status: "active", archived_at: "2026-09-10" })).toBe("revoked");
    expect(isAuthorisedToSellAlcohol(base, { status: "leaver" })).toBe(false);
  });

  it("reports none when there is no record", () => {
    expect(resolveAuthorisationStatus(null)).toBe("none");
  });

  it("restricts approval to admin/manager acting as DPS or personal licence holder", () => {
    expect(canApproveAuthorisation("admin", "dps")).toBe(true);
    expect(canApproveAuthorisation("manager", "personal_licence_holder")).toBe(true);
    expect(canApproveAuthorisation("staff", "dps")).toBe(false);
    expect(canApproveAuthorisation("admin", "supervisor")).toBe(false);
  });

  it("prefers the live authorisation", () => {
    const picked = latestAuthorisation([
      { id: "old", employee_id: "e1", status: "revoked", created_at: "2026-01-01" },
      { id: "live", employee_id: "e1", status: "active", created_at: "2025-01-01" },
    ]);
    expect(picked?.id).toBe("live");
  });
});

describe("inspection readiness", () => {
  const item = (over: Partial<Parameters<typeof checklistTone>[0]> = {}) => ({
    id: "c1",
    label: "Part B displayed",
    required: true,
    status: "ready",
    displayed: true,
    physical_copy_held: true,
    ...over,
  });

  it("colours checklist items", () => {
    expect(checklistTone(item())).toBe("green");
    expect(checklistTone(item({ status: "action_needed" }))).toBe("amber");
    expect(checklistTone(item({ status: "missing" }))).toBe("red");
    expect(checklistTone(item({ required: false }))).toBe("grey");
  });

  it("flags documents with no copy or an expired date", () => {
    const d = {
      id: "d1",
      name: "Premises licence",
      is_displayed: true,
      physical_copy_held: true,
      inspection_required: true,
      status: "active",
      has_copy: true,
      expiry_date: "2027-01-01",
    };
    expect(documentTone(d, TODAY)).toBe("green");
    expect(documentTone({ ...d, expiry_date: "2026-09-01" }, TODAY)).toBe("red");
    expect(documentTone({ ...d, has_copy: false, physical_copy_held: false }, TODAY)).toBe("red");
    expect(documentTone({ ...d, expiry_date: "2026-10-01" }, TODAY)).toBe("amber");
  });

  it("rolls up to the worst signal and lists outstanding items", () => {
    const r = summariseInspectionReadiness([item(), item({ id: "c2", label: "Section 57", status: "missing" })], [], TODAY);
    expect(r.tone).toBe("red");
    expect(r.red).toBe(1);
    expect(r.outstanding).toContain("Section 57");
  });

  it("is grey with nothing to check", () => {
    expect(summariseInspectionReadiness([], [], TODAY).tone).toBe("grey");
  });

  it("ships the Westminster checklist", () => {
    expect(DEFAULT_INSPECTION_CHECKLIST).toHaveLength(9);
    expect(DEFAULT_INSPECTION_CHECKLIST[0].label).toMatch(/Part B/);
  });
});

describe("safety: compliance code never touches payroll or holiday logic", () => {
  const files = [
    "src/lib/induction-pack-selection.ts",
    "src/lib/compliance-expiry.ts",
    "src/lib/alcohol-authorisation-status.ts",
    "src/lib/inspection-readiness.ts",
    "src/lib/compliance-taxonomy.ts",
  ];

  it("has no imports from payroll, holiday, NMW or service-charge modules", () => {
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf8");
      expect(src).not.toMatch(/from\s+["'][^"']*(payroll|holiday|nmw|service-charge)/i);
    }
  });
});
