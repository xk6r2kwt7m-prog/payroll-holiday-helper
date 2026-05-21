import { describe, it, expect } from "vitest";
import {
  getContractGenerationGate,
  HARD_REQUIRED_FIELDS,
  SOFT_WARNING_FIELDS,
  gateFieldLabel,
} from "@/lib/contract-generation-gate";
import type { ContractVariables } from "@/components/contracts/contractTemplates";

const validVariables: Partial<ContractVariables> = {
  employeeName: "Jane Doe",
  homeAddress: "1 High St, London",
  jobTitle: "Server",
  employmentType: "full_time",
  effectiveDate: "2025-01-15",
  workLocation: "Soho",
  baseHourlyRate: "12.5",
  weeklyHours: "40",
  noticePeriod: "two weeks",
};

const baseInput = {
  variables: validVariables,
  companyLegalName: "UglyOps Ltd",
  companyAddress: "10 Old Street, London",
};

function withMissing(field: keyof ContractVariables) {
  const v = { ...validVariables };
  (v as any)[field] = "";
  return { ...baseInput, variables: v };
}

describe("getContractGenerationGate — pass-through", () => {
  it("canGenerate=true when all hard-required fields are present", () => {
    const g = getContractGenerationGate(baseInput);
    expect(g.canGenerate).toBe(true);
    expect(g.blockingFields).toEqual([]);
    expect(g.message).toMatch(/all required/i);
  });
});

describe("getContractGenerationGate — blockers", () => {
  it.each([
    "employeeName",
    "homeAddress",
    "jobTitle",
    "employmentType",
    "effectiveDate",
    "workLocation",
    "noticePeriod",
  ] as (keyof ContractVariables)[])("blocks when %s is missing", (field) => {
    const g = getContractGenerationGate(withMissing(field));
    expect(g.canGenerate).toBe(false);
    expect(g.blockingFields.find((b) => b.field === field)).toBeTruthy();
    expect(g.message).toMatch(/cannot be generated/i);
  });

  it("blocks when baseHourlyRate is missing or zero", () => {
    expect(getContractGenerationGate(withMissing("baseHourlyRate")).canGenerate).toBe(false);
    const zero = getContractGenerationGate({
      ...baseInput,
      variables: { ...validVariables, baseHourlyRate: "0" },
    });
    expect(zero.canGenerate).toBe(false);
    expect(zero.blockingFields.find((b) => b.field === "baseHourlyRate")).toBeTruthy();
  });

  it("blocks when weeklyHours is missing or zero", () => {
    expect(getContractGenerationGate(withMissing("weeklyHours")).canGenerate).toBe(false);
    const zero = getContractGenerationGate({
      ...baseInput,
      variables: { ...validVariables, weeklyHours: "0" },
    });
    expect(zero.canGenerate).toBe(false);
  });

  it("blocks when companyLegalName is missing", () => {
    const g = getContractGenerationGate({ ...baseInput, companyLegalName: "" });
    expect(g.canGenerate).toBe(false);
    expect(g.blockingFields.find((b) => b.field === "companyLegalName")).toBeTruthy();
  });

  it("blocks when companyAddress is missing", () => {
    const g = getContractGenerationGate({ ...baseInput, companyAddress: "" });
    expect(g.canGenerate).toBe(false);
    expect(g.blockingFields.find((b) => b.field === "companyAddress")).toBeTruthy();
  });
});

describe("getContractGenerationGate — soft warnings & review", () => {
  it("reporting manager is a soft warning, never a blocker", () => {
    expect(SOFT_WARNING_FIELDS).toContain("reportingManagerName");
    expect(HARD_REQUIRED_FIELDS).not.toContain("reportingManagerName" as any);
    const g = getContractGenerationGate(baseInput);
    expect(g.canGenerate).toBe(true);
    expect(g.warningFields.find((w) => w.field === "reportingManagerName")).toBeTruthy();
  });

  it("does not warn when reporting manager is provided", () => {
    const g = getContractGenerationGate({
      ...baseInput,
      variables: { ...validVariables, reportingManagerName: "Alex" },
    });
    expect(g.warningFields).toEqual([]);
  });

  it("manually entered fields surface for review but do not block", () => {
    const g = getContractGenerationGate({
      ...baseInput,
      manualReviewFields: [{ field: "baseHourlyRate", label: "Base hourly rate" }],
    });
    expect(g.canGenerate).toBe(true);
    expect(g.manualReviewFields).toHaveLength(1);
  });
});

describe("getContractGenerationGate — purity", () => {
  it("does not mutate inputs", () => {
    const snap = JSON.stringify(baseInput);
    getContractGenerationGate(baseInput);
    expect(JSON.stringify(baseInput)).toBe(snap);
  });

  it("gateFieldLabel returns a readable label for each hard-required field", () => {
    for (const f of HARD_REQUIRED_FIELDS) {
      expect(gateFieldLabel(f)).toMatch(/\S/);
    }
  });
});

describe("Phase 5L safety", () => {
  it("helper has no React / Supabase / React Query imports", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-generation-gate.ts", "utf8");
    expect(src).not.toMatch(/from\s+["']react["']/);
    expect(src).not.toMatch(/from\s+["']@\/integrations\/supabase/);
    expect(src).not.toMatch(/from\s+["']@tanstack\/react-query["']/);
  });

  it("helper performs no Supabase mutations or persistence", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-generation-gate.ts", "utf8");
    expect(src).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(src).not.toMatch(/audit_log|audit_logs/);
  });

  it("dialog wires the gate and disables the generate button when blocked", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/contracts/ContractFormDialog.tsx", "utf8");
    expect(src).toMatch(/getContractGenerationGate/);
    expect(src).toMatch(/generation-gate-panel/);
    expect(src).toMatch(/disabled=\{generating \|\| !generationGate\.canGenerate\}/);
    // Defensive guard inside handleConfirmAndSave
    expect(src).toMatch(/if \(!generationGate\.canGenerate\)/);
  });

  it("does not change contract clauses, NMW, payroll, approval or audit modules", async () => {
    const fs = await import("node:fs/promises");
    const clauses = await fs.readFile("src/components/contracts/contractClauses.ts", "utf8");
    expect(clauses).not.toMatch(/contract-generation-gate/);
    const nmw = await fs.readFile("src/lib/uk-minimum-wage.ts", "utf8");
    expect(nmw).not.toMatch(/contract-generation-gate/);
  });

  it("employee creation flow still does not silently generate a contract", async () => {
    const fs = await import("node:fs/promises");
    const empForm = await fs.readFile("src/components/employees/EmployeeFormDialog.tsx", "utf8");
    expect(empForm).not.toMatch(/handleConfirmAndSave|generateSigningLink\.mutate|sendContractEmail\(|pdf\(/);
  });

  it("does not introduce employee / onboarding / active terms / signed contract mutations", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-generation-gate.ts", "utf8");
    expect(src).not.toMatch(/\.from\(["'][^"']+["']\)\s*\.(update|delete|upsert|insert)/);
  });
});
