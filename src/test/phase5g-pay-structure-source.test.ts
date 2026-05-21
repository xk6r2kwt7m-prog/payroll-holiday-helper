/**
 * Phase 5G — Pay structure field source visibility tests.
 *
 * Pure tests against the contract-form-review helpers, focusing on the
 * pay-related fields surfaced inside PayStructureFields:
 *   - baseHourlyRate
 *   - guaranteedServiceChargeRate
 *   - estimatedServiceChargeRate
 *   - troncSchemeName
 *   - serviceChargePolicyNote
 *
 * The PayStructureFields component itself is verified by reading its source
 * to confirm it renders the source-hint elements and accepts the new
 * `fieldSources` prop. No React rendering, no Supabase, no React Query.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getOriginalFieldSources,
  resolveContractFieldSources,
  getMissingContractFields,
  sourceLabel,
} from "@/lib/contract-form-review";
import type { ContractVariables } from "@/components/contracts/contractTemplates";

const baseVars: Partial<ContractVariables> = {
  employeeName: "Jane Doe",
  homeAddress: "1 High St",
  jobTitle: "Server",
  employmentType: "part_time",
  effectiveDate: "2025-01-15",
  weeklyHours: "32",
  workLocation: "Main",
  noticePeriod: "two weeks",
};

describe("Phase 5G — pay-field source resolution", () => {
  it("marks baseHourlyRate as active_terms when terms supply it", () => {
    const src = getOriginalFieldSources({
      employee: { hourly_rate: 11 },
      activeTerms: { base_hourly_rate: 14 },
    });
    expect(src.baseHourlyRate).toBe("active_terms");
  });

  it("falls back to employee_profile for baseHourlyRate when no terms", () => {
    const src = getOriginalFieldSources({ employee: { hourly_rate: 11 } });
    expect(src.baseHourlyRate).toBe("employee_profile");
  });

  it("marks guaranteed/estimated SC and tronc as active_terms when supplied", () => {
    const src = getOriginalFieldSources({
      employee: {},
      activeTerms: {
        guaranteed_service_charge_rate: 1.5,
        estimated_service_charge_rate: 2,
        tronc_scheme_name: "FOH Tronc",
        service_charge_policy_note: "Weekly distribution",
      },
    });
    expect(src.guaranteedServiceChargeRate).toBe("active_terms");
    expect(src.estimatedServiceChargeRate).toBe("active_terms");
    expect(src.troncSchemeName).toBe("active_terms");
    expect(src.serviceChargePolicyNote).toBe("active_terms");
  });

  it("falls back to employee_profile for estimated SC when only profile has it", () => {
    const src = getOriginalFieldSources({ employee: { service_charge: 1.25 } });
    expect(src.estimatedServiceChargeRate).toBe("employee_profile");
  });

  it("resolves to 'manual' once the user edits baseHourlyRate", () => {
    const resolved = resolveContractFieldSources({
      input: { employee: { hourly_rate: 11 }, activeTerms: { base_hourly_rate: 14 } },
      variables: { ...baseVars, baseHourlyRate: "15" },
      userEdited: new Set<keyof ContractVariables>(["baseHourlyRate"]),
    });
    expect(resolved.baseHourlyRate).toBe("manual");
  });

  it("resolves to 'missing' when no pay value is present", () => {
    const resolved = resolveContractFieldSources({
      input: { employee: {} },
      variables: { ...baseVars, baseHourlyRate: "" },
      userEdited: new Set(),
    });
    expect(resolved.baseHourlyRate).toBe("missing");
  });

  it("missing summary includes baseHourlyRate when not provided", () => {
    const missing = getMissingContractFields({ ...baseVars, baseHourlyRate: "" });
    expect(missing.map((m) => m.field)).toContain("baseHourlyRate");
  });

  it("missing summary excludes baseHourlyRate once filled", () => {
    const missing = getMissingContractFields({ ...baseVars, baseHourlyRate: "13.50" });
    expect(missing.map((m) => m.field)).not.toContain("baseHourlyRate");
  });

  it("sourceLabel produces the human-readable label for pay sources", () => {
    expect(sourceLabel("active_terms")).toMatch(/active employment terms/i);
    expect(sourceLabel("employee_profile")).toMatch(/employee profile/i);
    expect(sourceLabel("manual")).toMatch(/manually/i);
    expect(sourceLabel("missing")).toBe("Missing");
  });
});

describe("Phase 5G — PayStructureFields wiring (source inspection)", () => {
  const file = readFileSync(
    resolve(__dirname, "../components/contracts/PayStructureFields.tsx"),
    "utf8",
  );

  it("declares a fieldSources prop", () => {
    expect(file).toMatch(/fieldSources\?:/);
  });

  it("renders a source hint for base hourly rate", () => {
    expect(file).toMatch(/pay-source-baseHourlyRate|field="baseHourlyRate"/);
    expect(file).toMatch(/PaySourceHint[\s\S]*field="baseHourlyRate"/);
  });

  it("renders source hints for guaranteed and estimated service charge", () => {
    expect(file).toMatch(/PaySourceHint[\s\S]*field="guaranteedServiceChargeRate"/);
    expect(file).toMatch(/PaySourceHint[\s\S]*field="estimatedServiceChargeRate"/);
  });

  it("renders a source hint for tronc scheme", () => {
    expect(file).toMatch(/PaySourceHint[\s\S]*field="troncSchemeName"/);
  });

  it("uses the shared sourceLabel helper (no duplicated label logic)", () => {
    expect(file).toMatch(/sourceLabel/);
    expect(file).not.toMatch(/from active employment terms/i);
  });
});

describe("Phase 5G — confirm-step review wiring", () => {
  const dialog = readFileSync(
    resolve(__dirname, "../components/contracts/ContractFormDialog.tsx"),
    "utf8",
  );

  it("passes fieldSources to PayStructureFields", () => {
    expect(dialog).toMatch(/fieldSources=\{fieldSources\}/);
  });

  it("confirm review includes guaranteed service charge", () => {
    expect(dialog).toMatch(/review-row-guaranteedServiceChargeRate|guaranteedServiceChargeRate.*review/i);
    expect(dialog).toMatch(/guaranteedServiceChargeRate/);
  });

  it("confirm review includes estimated service charge", () => {
    expect(dialog).toMatch(/estimatedServiceChargeRate/);
  });

  it("confirm review includes tronc scheme", () => {
    expect(dialog).toMatch(/troncSchemeName/);
  });
});

describe("Phase 5G — helper purity", () => {
  const review = readFileSync(
    resolve(__dirname, "../lib/contract-form-review.ts"),
    "utf8",
  );
  const defaults = readFileSync(
    resolve(__dirname, "../lib/contract-employee-defaults.ts"),
    "utf8",
  );

  it("contract-form-review has no React/Supabase/RQ imports", () => {
    expect(review).not.toMatch(/from\s+["']react["']/);
    expect(review).not.toMatch(/@\/integrations\/supabase/);
    expect(review).not.toMatch(/@tanstack\/react-query/);
  });

  it("contract-employee-defaults has no React/Supabase/RQ imports", () => {
    expect(defaults).not.toMatch(/from\s+["']react["']/);
    expect(defaults).not.toMatch(/@\/integrations\/supabase/);
    expect(defaults).not.toMatch(/@tanstack\/react-query/);
  });
});
