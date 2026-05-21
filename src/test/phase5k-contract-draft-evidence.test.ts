import { describe, it, expect } from "vitest";
import {
  buildContractDraftEvidence,
  payDetailsStatusLabel,
  reportingManagerStatusLabel,
} from "@/lib/contract-draft-evidence";
import type { ContractFieldSource } from "@/lib/contract-form-review";
import type { ContractVariables } from "@/components/contracts/contractTemplates";

const base = {
  employee: { id: "emp-1" },
  contractType: "foh" as const,
  contractValues: {
    employeeName: "Jane Doe",
    employmentType: "full_time",
    effectiveDate: "2025-01-15",
    baseHourlyRate: "12.5",
    weeklyHours: "40",
    workLocation: "Soho",
    noticePeriod: "two weeks",
    jobTitle: "Server",
    homeAddress: "1 High St",
  } as Partial<ContractVariables>,
  fieldSources: {
    employeeName: "employee_profile",
    baseHourlyRate: "active_terms",
    homeAddress: "onboarding",
    jobTitle: "derived",
  } as Partial<Record<keyof ContractVariables, ContractFieldSource>>,
  missingFields: [],
  readinessStatus: "ready" as const,
  fromEmployeeCreationFlow: false,
  now: new Date("2026-05-21T10:00:00Z"),
};

describe("buildContractDraftEvidence", () => {
  it("captures readiness status", () => {
    const ev = buildContractDraftEvidence(base);
    expect(ev.readinessStatus).toBe("ready");
  });

  it("counts auto-filled fields across all auto sources", () => {
    const ev = buildContractDraftEvidence(base);
    expect(ev.autoFilledCount).toBe(4);
    expect(ev.autoFilledFields).toEqual(
      ["baseHourlyRate", "employeeName", "homeAddress", "jobTitle"].sort(),
    );
  });

  it("reports manually entered critical fields with labels", () => {
    const ev = buildContractDraftEvidence({
      ...base,
      fieldSources: { ...base.fieldSources, baseHourlyRate: "manual" },
    });
    expect(ev.manuallyEnteredCriticalFields.map((m) => m.field)).toContain("baseHourlyRate");
    expect(ev.manuallyEnteredCriticalFields[0].label).toMatch(/base hourly/i);
  });

  it("reports missing critical fields", () => {
    const ev = buildContractDraftEvidence({
      ...base,
      missingFields: [{ field: "weeklyHours", label: "Weekly contracted hours" }],
    });
    expect(ev.missingCriticalFields).toHaveLength(1);
    expect(ev.missingCriticalFields[0].field).toBe("weeklyHours");
  });

  it("captures reporting manager status (missing then provided)", () => {
    expect(buildContractDraftEvidence(base).reportingManagerStatus).toBe("missing");
    const ev = buildContractDraftEvidence({
      ...base,
      contractValues: { ...base.contractValues, reportingManagerName: "Alex Carter" },
    });
    expect(ev.reportingManagerStatus).toBe("provided");
  });

  it("captures pay details status across variants", () => {
    expect(buildContractDraftEvidence(base).payDetailsStatus).toBe("base_only");

    expect(
      buildContractDraftEvidence({
        ...base,
        contractValues: { ...base.contractValues, baseHourlyRate: "" },
      }).payDetailsStatus,
    ).toBe("missing");

    expect(
      buildContractDraftEvidence({
        ...base,
        contractValues: { ...base.contractValues, guaranteedServiceChargeRate: "2" },
      }).payDetailsStatus,
    ).toBe("with_guaranteed_sc");

    expect(
      buildContractDraftEvidence({
        ...base,
        contractValues: { ...base.contractValues, estimatedServiceChargeRate: "1.5" },
      }).payDetailsStatus,
    ).toBe("with_estimated_sc");

    expect(
      buildContractDraftEvidence({
        ...base,
        contractValues: { ...base.contractValues, troncSchemeName: "House tronc" },
      }).payDetailsStatus,
    ).toBe("with_tronc");
  });

  it("marks whether draft came from the employee creation flow", () => {
    expect(buildContractDraftEvidence(base).generatedFromEmployeeCreationFlow).toBe(false);
    expect(
      buildContractDraftEvidence({ ...base, fromEmployeeCreationFlow: true })
        .generatedFromEmployeeCreationFlow,
    ).toBe(true);
  });

  it("does not mutate its inputs", () => {
    const snapshot = JSON.stringify(base);
    buildContractDraftEvidence(base);
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it("returns ISO preparation timestamp", () => {
    const ev = buildContractDraftEvidence(base);
    expect(ev.preparedAtIso).toBe("2026-05-21T10:00:00.000Z");
  });

  it("provides human-readable labels", () => {
    expect(payDetailsStatusLabel("base_only")).toMatch(/base/i);
    expect(payDetailsStatusLabel("with_tronc")).toMatch(/tronc/i);
    expect(reportingManagerStatusLabel("provided")).toMatch(/provided/i);
    expect(reportingManagerStatusLabel("missing")).toMatch(/not set/i);
  });
});

describe("Phase 5K safety", () => {
  it("helper has no Supabase / React / React Query imports", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-draft-evidence.ts", "utf8");
    expect(src).not.toMatch(/from\s+["']react["']/);
    expect(src).not.toMatch(/from\s+["']@\/integrations\/supabase/);
    expect(src).not.toMatch(/from\s+["']@tanstack\/react-query["']/);
  });

  it("helper does not perform Supabase mutations or persistence", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-draft-evidence.ts", "utf8");
    expect(src).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    // Includes the future-audit TODO marker
    expect(src).toMatch(/TODO\(phase-future\)/);
    expect(src).toMatch(/Persistence is intentionally not implemented/i);
  });

  it("confirm step renders the evidence summary wired to the helper", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/contracts/ContractFormDialog.tsx", "utf8");
    expect(src).toMatch(/buildContractDraftEvidence/);
    expect(src).toMatch(/draft-evidence-summary/);
    expect(src).toMatch(/evidence-autofilled-count/);
    expect(src).toMatch(/evidence-manual-count/);
    expect(src).toMatch(/evidence-missing-count/);
    expect(src).toMatch(/evidence-reporting-manager/);
    expect(src).toMatch(/evidence-pay-details/);
  });

  it("does not introduce contract / employee / onboarding / terms persistence in evidence files", async () => {
    const fs = await import("node:fs/promises");
    const files = [
      "src/lib/contract-draft-evidence.ts",
      "src/lib/contract-readiness.ts",
      "src/lib/contract-form-review.ts",
      "src/lib/contract-draft-from-employee.ts",
    ];
    for (const f of files) {
      const src = await fs.readFile(f, "utf8");
      expect(src, f).not.toMatch(/audit_log|audit_logs/);
      expect(src, f).not.toMatch(/employee_documents|contracts_generated|signed_contracts/);
      expect(src, f).not.toMatch(/\.from\(["'][^"']+["']\)\s*\.(update|delete|upsert|insert)/);
    }
  });

  it("does not change contract legal wording / NMW / payroll modules", async () => {
    const fs = await import("node:fs/promises");
    const clauses = await fs.readFile("src/components/contracts/contractClauses.ts", "utf8");
    expect(clauses).not.toMatch(/contract-draft-evidence/);
    const nmw = await fs.readFile("src/lib/uk-minimum-wage.ts", "utf8");
    expect(nmw).not.toMatch(/contract-draft-evidence/);
  });
});
