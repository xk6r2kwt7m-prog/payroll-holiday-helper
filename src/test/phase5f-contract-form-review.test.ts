import { describe, it, expect } from "vitest";
import {
  getOriginalFieldSources,
  resolveContractFieldSources,
  getMissingContractFields,
  reviewContractForm,
  sourceLabel,
  CRITICAL_CONTRACT_FIELDS,
} from "@/lib/contract-form-review";

const emp = {
  forename: "Jane",
  surname: "Doe",
  department: "FOH",
  start_date: "2025-01-15",
  hourly_rate: 12.5,
};

describe("getOriginalFieldSources", () => {
  it("marks pay fields as active_terms when terms provide them", () => {
    const sources = getOriginalFieldSources({
      employee: emp,
      activeTerms: { base_hourly_rate: 14, employment_type: "part_time", contracted_hours: 32 },
    });
    expect(sources.baseHourlyRate).toBe("active_terms");
    expect(sources.employmentType).toBe("active_terms");
    expect(sources.weeklyHours).toBe("active_terms");
  });

  it("falls back to employee_profile for pay when no active terms", () => {
    const sources = getOriginalFieldSources({ employee: emp });
    expect(sources.baseHourlyRate).toBe("employee_profile");
    expect(sources.employeeName).toBe("employee_profile");
    expect(sources.effectiveDate).toBe("employee_profile");
  });

  it("uses onboarding source for home address", () => {
    const sources = getOriginalFieldSources({
      employee: emp,
      onboarding: { personal_info: { address: "1 High St" } },
    });
    expect(sources.homeAddress).toBe("onboarding");
  });

  it("marks job title as derived when only department is known", () => {
    const sources = getOriginalFieldSources({ employee: emp });
    expect(sources.jobTitle).toBe("derived");
  });

  it("marks job title as active_terms when role_title is set", () => {
    const sources = getOriginalFieldSources({
      employee: emp,
      activeTerms: { role_title: "Sous Chef" },
    });
    expect(sources.jobTitle).toBe("active_terms");
  });
});

describe("resolveContractFieldSources", () => {
  it("marks manual when the user has edited a field", () => {
    const sources = resolveContractFieldSources({
      input: { employee: emp },
      variables: { employeeName: "Jane D.", baseHourlyRate: "12.5" },
      userEdited: new Set(["employeeName"]),
    });
    expect(sources.employeeName).toBe("manual");
    expect(sources.baseHourlyRate).toBe("employee_profile");
  });

  it("marks missing when no value is present and not edited", () => {
    const sources = resolveContractFieldSources({
      input: { employee: { forename: "A", surname: "B" } },
      variables: {},
      userEdited: new Set(),
    });
    expect(sources.homeAddress).toBe("missing");
    expect(sources.weeklyHours).toBe("missing");
  });
});

describe("getMissingContractFields", () => {
  it("reports all critical fields when nothing is filled", () => {
    const missing = getMissingContractFields({});
    expect(missing.map((m) => m.field).sort()).toEqual([...CRITICAL_CONTRACT_FIELDS].sort());
  });

  it("returns an empty list when every critical field is filled", () => {
    const filled: any = {};
    for (const f of CRITICAL_CONTRACT_FIELDS) filled[f] = "x";
    expect(getMissingContractFields(filled)).toEqual([]);
  });

  it("treats whitespace-only values as missing", () => {
    const missing = getMissingContractFields({ employeeName: "   " });
    expect(missing.find((m) => m.field === "employeeName")).toBeTruthy();
  });
});

describe("reviewContractForm", () => {
  it("produces both sources and missing list and does not mutate inputs", () => {
    const input = {
      employee: { ...emp },
      onboarding: { personal_info: { address: "1 High St" } },
      activeTerms: { base_hourly_rate: 14 },
    };
    const variables = { employeeName: "Jane Doe", baseHourlyRate: "14" };
    const snapshot = JSON.stringify({ input, variables });
    const { sources, missing } = reviewContractForm({
      input,
      variables,
      userEdited: new Set(),
    });
    expect(JSON.stringify({ input, variables })).toBe(snapshot);
    expect(sources.employeeName).toBe("employee_profile");
    expect(sources.baseHourlyRate).toBe("active_terms");
    expect(missing.find((m) => m.field === "homeAddress")).toBeTruthy();
  });
});

describe("sourceLabel", () => {
  it("returns a human label for each source", () => {
    expect(sourceLabel("employee_profile")).toMatch(/employee profile/i);
    expect(sourceLabel("active_terms")).toMatch(/active employment terms/i);
    expect(sourceLabel("onboarding")).toMatch(/onboarding/i);
    expect(sourceLabel("derived")).toMatch(/derived/i);
    expect(sourceLabel("manual")).toMatch(/manually/i);
    expect(sourceLabel("missing")).toMatch(/missing/i);
  });
});

describe("safety (Phase 5F)", () => {
  it("pure helper has no Supabase / React / RQ imports", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-form-review.ts", "utf8");
    expect(src).not.toMatch(/from\s+["']@\/integrations\/supabase/);
    expect(src).not.toMatch(/from\s+["']react["']/);
    expect(src).not.toMatch(/from\s+["']@tanstack\/react-query["']/);
  });

  it("dialog renders missing-fields warning, source hints and review summary", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/contracts/ContractFormDialog.tsx", "utf8");
    expect(src).toMatch(/missing-fields-warning/);
    expect(src).toMatch(/confirm-review-summary/);
    expect(src).toMatch(/FieldSourceHint/);
    expect(src).toMatch(/resolveContractFieldSources/);
    expect(src).toMatch(/getMissingContractFields/);
  });

  it("dialog still tracks manual edits and resets them on employee switch / close", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/contracts/ContractFormDialog.tsx", "utf8");
    // Manual-edit tracking preserved from Phase 5E
    expect(src).toMatch(/userEdited/);
    expect(src).toMatch(/employeeId !== selectedEmployeeId/);
    // handleClose resets the manual-edit set
    expect(src).toMatch(/setUserEdited\(new Set\(\)\)/);
    expect(src).toMatch(/setContractTypeEdited\(false\)/);
  });

  it("does not add Supabase mutations from the review / source helpers", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-form-review.ts", "utf8");
    expect(src).not.toMatch(/\.update\(|\.insert\(|\.delete\(|\.upsert\(/);
  });

  it("does not change contract legal wording or generation logic from this phase", async () => {
    const fs = await import("node:fs/promises");
    const clauses = await fs.readFile("src/components/contracts/contractClauses.ts", "utf8");
    // sanity: the clauses module should not import the review helpers
    expect(clauses).not.toMatch(/contract-form-review/);
    expect(clauses).not.toMatch(/contract-employee-defaults/);
  });
});
