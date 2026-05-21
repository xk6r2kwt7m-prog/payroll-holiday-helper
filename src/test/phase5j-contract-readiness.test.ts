import { describe, it, expect } from "vitest";
import { deriveContractReadiness } from "@/lib/contract-readiness";
import {
  CRITICAL_CONTRACT_FIELDS,
  type ContractFieldSource,
} from "@/lib/contract-form-review";
import type { ContractVariables } from "@/components/contracts/contractTemplates";

function allCriticalFilledSources(
  source: ContractFieldSource = "employee_profile",
): Partial<Record<keyof ContractVariables, ContractFieldSource>> {
  const map: Partial<Record<keyof ContractVariables, ContractFieldSource>> = {};
  for (const f of CRITICAL_CONTRACT_FIELDS) map[f] = source;
  return map;
}

describe("deriveContractReadiness", () => {
  it("returns 'ready' when nothing is missing and no critical field is manual", () => {
    const r = deriveContractReadiness({
      missing: [],
      sources: allCriticalFilledSources("active_terms"),
    });
    expect(r.status).toBe("ready");
    expect(r.bannerTone).toBe("info");
    expect(r.bannerTitle).toMatch(/ready/i);
    expect(r.manualCriticalFields).toEqual([]);
  });

  it("returns 'missing_details' when critical fields are missing", () => {
    const r = deriveContractReadiness({
      missing: [{ field: "homeAddress", label: "Home address" }],
      sources: {},
    });
    expect(r.status).toBe("missing_details");
    expect(r.bannerTone).toBe("warning");
    expect(r.bannerTitle).toMatch(/missing/i);
  });

  it("returns 'needs_review' when nothing is missing but a critical field was edited manually", () => {
    const sources = allCriticalFilledSources("employee_profile");
    sources.baseHourlyRate = "manual";
    const r = deriveContractReadiness({ missing: [], sources });
    expect(r.status).toBe("needs_review");
    expect(r.bannerTone).toBe("warning");
    expect(r.manualCriticalFields.map((m) => m.field)).toContain("baseHourlyRate");
  });

  it("prefers 'missing_details' over 'needs_review' when both apply", () => {
    const sources = allCriticalFilledSources();
    sources.baseHourlyRate = "manual";
    const r = deriveContractReadiness({
      missing: [{ field: "homeAddress", label: "Home address" }],
      sources,
    });
    expect(r.status).toBe("missing_details");
  });

  it("only counts manual edits on critical fields", () => {
    const sources = allCriticalFilledSources();
    sources.troncSchemeName = "manual"; // not critical
    const r = deriveContractReadiness({ missing: [], sources });
    expect(r.status).toBe("ready");
    expect(r.manualCriticalFields).toEqual([]);
  });
});

describe("Phase 5J safety", () => {
  it("readiness helper has no React / Supabase / React Query imports", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-readiness.ts", "utf8");
    expect(src).not.toMatch(/from\s+["']react["']/);
    expect(src).not.toMatch(/from\s+["']@\/integrations\/supabase/);
    expect(src).not.toMatch(/from\s+["']@tanstack\/react-query["']/);
  });

  it("readiness helper performs no Supabase mutations", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-readiness.ts", "utf8");
    expect(src).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  });

  it("dialog renders a readiness banner driven by deriveContractReadiness", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/contracts/ContractFormDialog.tsx", "utf8");
    expect(src).toMatch(/deriveContractReadiness/);
    expect(src).toMatch(/readiness-banner/);
    expect(src).toMatch(/confirm-manual-warning/);
    expect(src).toMatch(/data-readiness-status/);
  });

  it("dialog does not silently sign / issue / send the contract from the new-employee flow", async () => {
    const fs = await import("node:fs/promises");
    const dialog = await fs.readFile("src/components/contracts/ContractFormDialog.tsx", "utf8");
    const empForm = await fs.readFile("src/components/employees/EmployeeFormDialog.tsx", "utf8");
    // No auto-call to generate signing link / send email / save without manager click.
    expect(empForm).not.toMatch(/handleConfirmAndSave|generateSigningLink\.mutate|sendContractEmail/);
    // Manager must click Generate & Save in the dialog footer.
    expect(dialog).toMatch(/Generate & Save/);
  });

  it("contract draft helpers do not mutate employee / onboarding / active-terms data", async () => {
    const fs = await import("node:fs/promises");
    const files = [
      "src/lib/contract-readiness.ts",
      "src/lib/contract-form-review.ts",
      "src/lib/contract-employee-defaults.ts",
      "src/lib/contract-draft-from-employee.ts",
    ];
    for (const f of files) {
      const src = await fs.readFile(f, "utf8");
      expect(src, f).not.toMatch(/\.from\(["']employees["']\)\s*\.(update|delete|upsert|insert)/);
      expect(src, f).not.toMatch(/\.from\(["']employee_onboarding["']\)\s*\.(update|delete|upsert|insert)/);
      expect(src, f).not.toMatch(/\.from\(["']employment_terms["']\)\s*\.(update|delete|upsert|insert)/);
    }
  });

  it("contract clauses / NMW / payroll / approval logic untouched by Phase 5J", async () => {
    const fs = await import("node:fs/promises");
    const clauses = await fs.readFile("src/components/contracts/contractClauses.ts", "utf8");
    expect(clauses).not.toMatch(/contract-readiness/);
    const nmw = await fs.readFile("src/lib/uk-minimum-wage.ts", "utf8");
    expect(nmw).not.toMatch(/contract-readiness/);
  });
});
