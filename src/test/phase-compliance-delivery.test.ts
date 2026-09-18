/**
 * Documents & Compliance — delivery guards.
 *
 * Covers induction selection end-to-end behaviour used by the wizard,
 * expiry reminder cadence, alcohol authorisation gating, and a safety
 * assertion that no compliance code touches payroll / holiday / NMW /
 * service-charge logic.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { selectInductionDocuments, summariseSelection } from "@/lib/induction-pack-selection";
import { reminderDueToday, resolveExpiryBand } from "@/lib/compliance-expiry";
import { resolveAuthorisationStatus, canApproveAuthorisation } from "@/lib/alcohol-authorisation-status";
import { summariseInspectionReadiness, DEFAULT_INSPECTION_CHECKLIST } from "@/lib/inspection-readiness";
import { suggestStaffRole, roleMaySellAlcohol } from "@/lib/compliance-taxonomy";

const doc = (over: Record<string, unknown> = {}) => ({
  id: Math.random().toString(36).slice(2),
  name: "Doc",
  category: "Staff induction",
  version: 1,
  status: "active",
  archived_at: null,
  expires_at: null,
  applies_to_all_branches: true,
  branches: [],
  applies_to_all_roles: true,
  roles: [],
  include_in_induction: true,
  requires_signature: true,
  alcohol_related: false,
  ...over,
}) as any;

describe("induction pack selection (wizard behaviour)", () => {
  it("picks branch and role matched documents automatically", () => {
    const docs = [
      doc({ name: "Company induction" }),
      doc({ name: "Carnaby H&S", applies_to_all_branches: false, branches: ["Carnaby"] }),
      doc({ name: "Brixton H&S", applies_to_all_branches: false, branches: ["Brixton"] }),
      doc({ name: "Kitchen only", applies_to_all_roles: false, roles: ["Kitchen"] }),
    ];
    const picked = selectInductionDocuments({
      documents: docs,
      branch: "Carnaby",
      role: "Front of House",
    });
    const names = picked.map(d => d.name);
    expect(names).toContain("Company induction");
    expect(names).toContain("Carnaby H&S");
    expect(names).not.toContain("Brixton H&S");
    expect(names).not.toContain("Kitchen only");
  });

  it("only includes alcohol documents when alcohol sales apply", () => {
    const docs = [doc({ name: "General" }), doc({ name: "Challenge 25", alcohol_related: true })];
    expect(selectInductionDocuments({ documents: docs, includeAlcohol: false }).map(d => d.name))
      .toEqual(["General"]);
    expect(selectInductionDocuments({ documents: docs, includeAlcohol: true }).map(d => d.name).sort())
      .toEqual(["Challenge 25", "General"]);
  });

  it("never includes archived or expired documents", () => {
    const docs = [
      doc({ name: "Archived", status: "archived", archived_at: "2026-01-01" }),
      doc({ name: "Expired", expires_at: "2020-01-01" }),
      doc({ name: "Current" }),
    ];
    expect(selectInductionDocuments({ documents: docs }).map(d => d.name)).toEqual(["Current"]);
  });

  it("summarises the count in plain English", () => {
    expect(summariseSelection(12)).toMatch(/12/);
  });

  it("suggests a role from the department and flags alcohol relevance", () => {
    const role = suggestStaffRole("Front of House", undefined);
    expect(role).toBe("Front of House");
    expect(roleMaySellAlcohol(role!)).toBe(true);
    expect(roleMaySellAlcohol("Kitchen")).toBe(false);
  });
});

describe("certificate reminders", () => {
  const today = new Date("2026-06-01T00:00:00Z");
  const plus = (days: number) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  it("fires only at 90, 60, 30 days and on the day", () => {
    [90, 60, 30, 0].forEach(d => expect(reminderDueToday(plus(d), today)).toBe(d));
    [89, 61, 45, 31, 7, 1].forEach(d => expect(reminderDueToday(plus(d), today)).toBeNull());
  });

  it("marks a past date as expired", () => {
    expect(resolveExpiryBand(plus(-1), today)).toBe("expired");
  });
});

describe("alcohol authorisation", () => {
  it("stays pending until both the staff signature and the authoriser confirmation exist", () => {
    expect(resolveAuthorisationStatus({ status: "active", employee_signed_at: "x" } as any)).toBe("pending");
    expect(
      resolveAuthorisationStatus({ status: "active", employee_signed_at: "x", authoriser_confirmed_at: "y" } as any)
    ).toBe("active");
  });

  it("revokes automatically when the person leaves", () => {
    expect(
      resolveAuthorisationStatus(
        { status: "active", employee_signed_at: "x", authoriser_confirmed_at: "y" } as any,
        { status: "leaver" } as any
      )
    ).toBe("revoked");
  });

  it("only lets an admin or manager acting as DPS or licence holder approve", () => {
    expect(canApproveAuthorisation("admin", "dps")).toBe(true);
    expect(canApproveAuthorisation("manager", "personal_licence_holder")).toBe(true);
    expect(canApproveAuthorisation("staff", "dps")).toBe(false);
  });
});

describe("inspection readiness", () => {
  it("ships an editable starting checklist", () => {
    expect(DEFAULT_INSPECTION_CHECKLIST.length).toBeGreaterThanOrEqual(9);
  });

  it("reports the worst state and lists what is outstanding", () => {
    const result = summariseInspectionReadiness(
      [
        { label: "Part B displayed", status: "missing", required: true } as any,
        { label: "Section 57", status: "ready", required: true } as any,
      ],
      []
    );
    expect(result.tone).toBe("red");
    expect(result.outstanding.join(" ")).toContain("Part B displayed");
  });
});

describe("safety: compliance code is additive only", () => {
  const forbidden = ["payroll", "holiday", "nmw", "service-charge", "servicecharge", "timesheet"];
  const sourceFiles = (directory: string): string[] => readdirSync(directory)
    .flatMap((name) => {
      const path = join(directory, name);
      return statSync(path).isDirectory() ? sourceFiles(path) : [path];
    });

  it("no compliance library, hook or component imports payroll or holiday logic", () => {
    const files: string[] = [
      ...sourceFiles("src/components/compliance"),
      "src/hooks/useCompliance.ts",
      "src/pages/DocumentsCompliance.tsx",
      "src/pages/InductionPortal.tsx",
      "src/lib/compliance-taxonomy.ts",
      "src/lib/compliance-expiry.ts",
      "src/lib/induction-pack-selection.ts",
      "src/lib/alcohol-authorisation-status.ts",
      "src/lib/inspection-readiness.ts",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const imports = source
        .split("\n")
        .filter(line => line.trim().startsWith("import"))
        .join("\n")
        .toLowerCase();
      for (const term of forbidden) {
        expect(imports.includes(term), `${file} must not import ${term} logic`).toBe(false);
      }
    }
  });

  it("compliance hooks never write to payroll, holiday or timesheet tables", () => {
    const source = readFileSync("src/hooks/useCompliance.ts", "utf8");
    ["payroll_", "holiday_", "time_entries", "shifts"].forEach(table => {
      expect(source.includes(table)).toBe(false);
    });
  });
});
