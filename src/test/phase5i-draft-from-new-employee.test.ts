import { describe, it, expect } from "vitest";
import {
  buildContractDraftFromNewEmployee,
  type BuildContractDraftInput,
} from "@/lib/contract-draft-from-employee";

const baseEmployee = {
  id: "emp-1",
  forename: "Jane",
  surname: "Doe",
  department: "FOH",
  start_date: "2025-02-01",
  hourly_rate: 12.5,
};

const completeOnboarding = {
  personal_info: {
    address_line_1: "1 High St",
    city: "London",
    postcode: "W1 1AA",
    line_manager: "Alex Carter",
    line_manager_title: "Operations Manager",
  },
};

const completeTerms = {
  role_title: "Waiter",
  employment_type: "part_time",
  work_location: "Main Branch",
  contracted_hours: 30,
  base_hourly_rate: 13,
  notice_period_weeks: 2,
};

const tenant = { company_name: "Ugly Dumpling Ltd", address: "10 Trade St, London" };

describe("buildContractDraftFromNewEmployee", () => {
  it("auto-fills variables from employee + onboarding + active terms", () => {
    const out = buildContractDraftFromNewEmployee({
      employee: baseEmployee,
      onboarding: completeOnboarding,
      activeTerms: completeTerms,
      tenantSettings: tenant,
    });
    expect(out.variables.employeeName).toBe("Jane Doe");
    expect(out.variables.homeAddress).toContain("1 High St");
    expect(out.variables.jobTitle).toBe("Waiter");
    expect(out.variables.baseHourlyRate).toBe("13");
    expect(out.variables.weeklyHours).toBe("30");
    expect(out.variables.workLocation).toBe("Main Branch");
    expect(out.variables.employmentType).toBe("part_time");
    expect(out.variables.noticePeriod).toBe("two weeks");
    expect(out.variables.reportingManagerName).toBe("Alex Carter");
    expect(out.variables.reportingManagerTitle).toBe("Operations Manager");
    expect(out.companyLegalName).toBe("Ugly Dumpling Ltd");
    expect(out.companyAddress).toBe("10 Trade St, London");
    expect(out.contractType).toBe("foh");
  });

  it("returns ready=true when all critical fields are present", () => {
    const out = buildContractDraftFromNewEmployee({
      employee: baseEmployee,
      onboarding: completeOnboarding,
      activeTerms: completeTerms,
      tenantSettings: tenant,
    });
    expect(out.ready).toBe(true);
    expect(out.missing).toEqual([]);
  });

  it("returns ready=false and lists missing critical fields when data is thin", () => {
    const out = buildContractDraftFromNewEmployee({
      employee: { forename: "Jane", surname: "Doe", department: "FOH" },
    });
    expect(out.ready).toBe(false);
    const fields = out.missing.map((m) => m.field);
    expect(fields).toContain("homeAddress");
    expect(fields).toContain("baseHourlyRate");
    expect(fields).toContain("weeklyHours");
    expect(fields).toContain("workLocation");
  });

  it("does not throw on totally empty inputs", () => {
    expect(() =>
      buildContractDraftFromNewEmployee({ employee: {} as any }),
    ).not.toThrow();
  });

  it("produces a source map (employee_profile / active_terms / onboarding)", () => {
    const out = buildContractDraftFromNewEmployee({
      employee: baseEmployee,
      onboarding: completeOnboarding,
      activeTerms: completeTerms,
    });
    expect(out.sources.employeeName).toBe("employee_profile");
    expect(out.sources.baseHourlyRate).toBe("active_terms");
    expect(out.sources.homeAddress).toBe("onboarding");
    expect(out.sources.reportingManagerName).toBe("onboarding");
  });

  it("does not mutate its inputs", () => {
    const input: BuildContractDraftInput = {
      employee: { ...baseEmployee },
      onboarding: JSON.parse(JSON.stringify(completeOnboarding)),
      activeTerms: { ...completeTerms },
      tenantSettings: { ...tenant },
    };
    const snap = JSON.stringify(input);
    buildContractDraftFromNewEmployee(input);
    expect(JSON.stringify(input)).toBe(snap);
  });

  it("falls back to empty strings for company fields when tenant settings are missing", () => {
    const out = buildContractDraftFromNewEmployee({ employee: baseEmployee });
    expect(out.companyLegalName).toBe("");
    expect(out.companyAddress).toBe("");
  });
});

describe("safety (Phase 5I)", () => {
  it("pure helper has no Supabase / React / RQ imports and no DB writes", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-draft-from-employee.ts", "utf8");
    expect(src).not.toMatch(/from\s+["']react["']/);
    expect(src).not.toMatch(/@\/integrations\/supabase/);
    expect(src).not.toMatch(/@tanstack\/react-query/);
    expect(src).not.toMatch(/\.update\(|\.insert\(|\.delete\(|\.upsert\(/);
  });

  it("EmployeeFormDialog wires the after-create draft contract prompt", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/employees/EmployeeFormDialog.tsx", "utf8");
    expect(src).toMatch(/after-create-contract-prompt/);
    expect(src).toMatch(/after-create-contract-confirm/);
    expect(src).toMatch(/after-create-contract-skip/);
    expect(src).toMatch(/ContractFormDialog/);
    expect(src).toMatch(/preselectedEmployeeId=\{contractDialogEmployeeId\}/);
    // Prompt is only shown for create, not edit
    expect(src).toMatch(/if \(!employee && employeeId\)/);
  });

  it("EmployeeFormDialog does not generate, sign, lock or send the contract from this flow", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/employees/EmployeeFormDialog.tsx", "utf8");
    // No direct contract signing / locking / sending API calls added by this phase
    expect(src).not.toMatch(/useGenerateSigningLink|useSendContractEmail|generateSigningLink|sendContractEmail/);
    expect(src).not.toMatch(/contracts_signed|signed_contract/);
  });

  it("contract dialog continues to manage manual-edit state (regression check)", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/contracts/ContractFormDialog.tsx", "utf8");
    expect(src).toMatch(/setUserEdited\(new Set\(\)\)/);
    expect(src).toMatch(/employeeId !== selectedEmployeeId/);
  });
});
