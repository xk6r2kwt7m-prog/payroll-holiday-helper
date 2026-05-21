import { describe, it, expect } from "vitest";
import {
  mapEmployeeToContractDefaults,
  deriveContractTypeFromDepartment,
} from "@/lib/contract-employee-defaults";

const baseEmp = {
  forename: "Jane",
  surname: "Doe",
  department: "FOH",
  start_date: "2025-01-15",
  hourly_rate: 12.5,
  service_charge: 1.25,
};

describe("deriveContractTypeFromDepartment", () => {
  it("maps FOH variants", () => {
    expect(deriveContractTypeFromDepartment("FOH")).toBe("foh");
    expect(deriveContractTypeFromDepartment("Front of House")).toBe("foh");
  });
  it("maps kitchen variants", () => {
    expect(deriveContractTypeFromDepartment("BOH")).toBe("kitchen");
    expect(deriveContractTypeFromDepartment("Kitchen")).toBe("kitchen");
    expect(deriveContractTypeFromDepartment("CPU")).toBe("kitchen");
  });
  it("maps management and supervisor", () => {
    expect(deriveContractTypeFromDepartment("Management")).toBe("management");
    expect(deriveContractTypeFromDepartment("Supervisor")).toBe("supervisor");
  });
  it("falls back to foh on empty / unknown", () => {
    expect(deriveContractTypeFromDepartment(null)).toBe("foh");
    expect(deriveContractTypeFromDepartment("")).toBe("foh");
    expect(deriveContractTypeFromDepartment("weird-dept")).toBe("foh");
  });
});

describe("mapEmployeeToContractDefaults", () => {
  it("fills full name from forename and surname", () => {
    const { variables } = mapEmployeeToContractDefaults({ employee: baseEmp });
    expect(variables.employeeName).toBe("Jane Doe");
  });

  it("fills job title and infers contract type from department", () => {
    const r = mapEmployeeToContractDefaults({ employee: { ...baseEmp, department: "Kitchen" } });
    expect(r.contractType).toBe("kitchen");
    expect(r.variables.jobTitle).toBeTruthy();
  });

  it("fills home address from onboarding personal_info.address", () => {
    const { variables } = mapEmployeeToContractDefaults({
      employee: baseEmp,
      onboarding: { personal_info: { address: "52 Thornton Avenue, UB7 9JX" } },
    });
    expect(variables.homeAddress).toBe("52 Thornton Avenue, UB7 9JX");
  });

  it("composes address from parts when no single address string is present", () => {
    const { variables } = mapEmployeeToContractDefaults({
      employee: baseEmp,
      onboarding: {
        personal_info: { address_line_1: "1 High St", city: "London", postcode: "E1 1AA" },
      },
    });
    expect(variables.homeAddress).toBe("1 High St, London, E1 1AA");
  });

  it("fills pay rate from employee.hourly_rate when no active terms", () => {
    const { variables } = mapEmployeeToContractDefaults({ employee: baseEmp });
    expect(variables.baseHourlyRate).toBe("12.5");
    expect(variables.hourlyRate).toBe("12.5");
  });

  it("prefers active terms base_hourly_rate over employee.hourly_rate", () => {
    const { variables } = mapEmployeeToContractDefaults({
      employee: baseEmp,
      activeTerms: { base_hourly_rate: 14 },
    });
    expect(variables.baseHourlyRate).toBe("14");
  });

  it("fills employment type when valid", () => {
    const { variables } = mapEmployeeToContractDefaults({
      employee: baseEmp,
      activeTerms: { employment_type: "part_time" },
    });
    expect(variables.employmentType).toBe("part_time");
  });

  it("omits employment type when value is not in the enum", () => {
    const { variables } = mapEmployeeToContractDefaults({
      employee: baseEmp,
      activeTerms: { employment_type: "casual" as any },
    });
    expect(variables.employmentType).toBeUndefined();
  });

  it("fills weekly hours from active terms contracted_hours", () => {
    const { variables } = mapEmployeeToContractDefaults({
      employee: baseEmp,
      activeTerms: { contracted_hours: 32 },
    });
    expect(variables.weeklyHours).toBe("32");
  });

  it("fills work location and tronc / policy notes from active terms", () => {
    const { variables } = mapEmployeeToContractDefaults({
      employee: baseEmp,
      activeTerms: {
        work_location: "Main Site — London",
        tronc_scheme_name: "House Tronc",
        service_charge_policy_note: "Paid weekly via tronc.",
      },
    });
    expect(variables.workLocation).toBe("Main Site — London");
    expect(variables.troncSchemeName).toBe("House Tronc");
    expect(variables.serviceChargePolicyNote).toBe("Paid weekly via tronc.");
  });

  it("maps notice period weeks to human text", () => {
    expect(
      mapEmployeeToContractDefaults({ employee: baseEmp, activeTerms: { notice_period_weeks: 1 } })
        .variables.noticePeriod,
    ).toBe("one week");
    expect(
      mapEmployeeToContractDefaults({ employee: baseEmp, activeTerms: { notice_period_weeks: 4 } })
        .variables.noticePeriod,
    ).toBe("1 month");
  });

  it("uses employee.start_date for effective date", () => {
    const { variables } = mapEmployeeToContractDefaults({ employee: baseEmp });
    expect(variables.effectiveDate).toBe("2025-01-15");
  });

  it("does not crash on empty inputs and returns sensible defaults", () => {
    const { variables, contractType } = mapEmployeeToContractDefaults({});
    expect(contractType).toBe("foh");
    expect(variables.employeeName).toBeUndefined();
    expect(variables.homeAddress).toBeUndefined();
    expect(variables.baseHourlyRate).toBeUndefined();
  });

  it("strips undefined keys so callers can iterate cleanly", () => {
    const { variables } = mapEmployeeToContractDefaults({ employee: { forename: "Bob" } });
    for (const v of Object.values(variables)) {
      expect(v).not.toBeUndefined();
    }
  });

  it("does not mutate inputs", () => {
    const emp = { ...baseEmp };
    const ob = { personal_info: { address: "X" } };
    const terms = { base_hourly_rate: 15 };
    const snapshot = JSON.stringify({ emp, ob, terms });
    mapEmployeeToContractDefaults({ employee: emp, onboarding: ob, activeTerms: terms });
    expect(JSON.stringify({ emp, ob, terms })).toBe(snapshot);
  });

  it("refreshes values for a different employee", () => {
    const a = mapEmployeeToContractDefaults({
      employee: { forename: "Alice", surname: "A", hourly_rate: 11, department: "FOH" },
    });
    const b = mapEmployeeToContractDefaults({
      employee: { forename: "Bob", surname: "B", hourly_rate: 13, department: "Kitchen" },
    });
    expect(a.variables.employeeName).toBe("Alice A");
    expect(b.variables.employeeName).toBe("Bob B");
    expect(a.contractType).toBe("foh");
    expect(b.contractType).toBe("kitchen");
    expect(a.variables.baseHourlyRate).toBe("11");
    expect(b.variables.baseHourlyRate).toBe("13");
  });
});

describe("safety guarantees (Phase 5E)", () => {
  it("is a pure module — no supabase or react imports", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/lib/contract-employee-defaults.ts", "utf8");
    expect(src).not.toMatch(/from\s+["']@\/integrations\/supabase/);
    expect(src).not.toMatch(/from\s+["']react["']/);
    expect(src).not.toMatch(/from\s+["']@tanstack\/react-query["']/);
  });

  it("ContractFormDialog tracks user-edited fields and resets on employee change", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/contracts/ContractFormDialog.tsx", "utf8");
    expect(src).toMatch(/userEdited/);
    expect(src).toMatch(/mapEmployeeToContractDefaults/);
    // Reset block when a different employee is selected
    expect(src).toMatch(/employeeId !== selectedEmployeeId/);
  });
});
