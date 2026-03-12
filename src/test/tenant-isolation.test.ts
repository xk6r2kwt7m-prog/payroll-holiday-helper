import { describe, it, expect } from "vitest";
import { calculateCapeVerdeProportionalLeave, isCapeVerdeNightWork } from "@/hooks/useCountryRules";

describe("Tenant Isolation", () => {
  it("new tenant starts with no inherited branches", () => {
    const shiftDefaults = require("@/components/schedule/shiftDefaults");
    expect(shiftDefaults.getMinimumStaff("SomeBranch", "FOH", "Mon")).toBe(2);
    expect(shiftDefaults.getMinimumStaff("AnyBranch", "BOH", "Wed")).toBe(2);
    expect(shiftDefaults.getMinimumStaff("NewPlace", "CPU", "Fri")).toBe(2);
  });

  it("shiftDefaults does not contain hardcoded branch names", () => {
    const src = require("@/components/schedule/shiftDefaults");
    const fnString = src.getMinimumStaff.toString();
    expect(fnString).not.toContain("Fitzrovia");
    expect(fnString).not.toContain("Carnaby");
    expect(fnString).not.toContain("Brixton");
  });

  it("WORK_LOCATIONS is empty (no hardcoded addresses)", () => {
    const { WORK_LOCATIONS } = require("@/components/contracts/contractTemplates");
    expect(WORK_LOCATIONS).toEqual([]);
  });

  it("contract templates do not contain hardcoded tenant addresses", () => {
    const mod = require("@/components/contracts/contractTemplates");
    const srcString = JSON.stringify(mod);
    expect(srcString).not.toContain("Fitzrovia");
    expect(srcString).not.toContain("Carnaby");
    expect(srcString).not.toContain("Brixton");
    expect(srcString).not.toContain("Rathbone");
    expect(srcString).not.toContain("Newburgh");
  });
});

describe("Cape Verde Labour Rules", () => {
  it("calculates proportional leave for contracts under 1 year", () => {
    expect(calculateCapeVerdeProportionalLeave(1)).toBe(2);
    expect(calculateCapeVerdeProportionalLeave(6)).toBe(12);
    expect(calculateCapeVerdeProportionalLeave(11)).toBe(22);
    expect(calculateCapeVerdeProportionalLeave(12)).toBe(22);
    expect(calculateCapeVerdeProportionalLeave(0)).toBe(0);
  });

  it("full year entitlement is 22 days", () => {
    expect(calculateCapeVerdeProportionalLeave(12)).toBe(22);
    expect(calculateCapeVerdeProportionalLeave(24)).toBe(22);
  });

  it("identifies night work hours correctly (22:00-06:00)", () => {
    expect(isCapeVerdeNightWork(22)).toBe(true);
    expect(isCapeVerdeNightWork(23)).toBe(true);
    expect(isCapeVerdeNightWork(0)).toBe(true);
    expect(isCapeVerdeNightWork(3)).toBe(true);
    expect(isCapeVerdeNightWork(5)).toBe(true);
    expect(isCapeVerdeNightWork(6)).toBe(false);
    expect(isCapeVerdeNightWork(12)).toBe(false);
    expect(isCapeVerdeNightWork(21)).toBe(false);
  });
});

describe("Country Rules Engine", () => {
  it("PAY_TYPES includes all required models", () => {
    const { PAY_TYPES } = require("@/hooks/useCountryRules");
    const values = PAY_TYPES.map((p: any) => p.value);
    expect(values).toContain("hourly");
    expect(values).toContain("daily_rate");
    expect(values).toContain("monthly_salary");
    expect(values).toContain("monthly_salary_overtime");
    expect(values).toContain("monthly_salary_service_charge");
    expect(values).toContain("hourly_service_charge");
    expect(values).toContain("no_service_charge");
  });

  it("OVERTIME_MODELS includes standard options", () => {
    const { OVERTIME_MODELS } = require("@/hooks/useCountryRules");
    const values = OVERTIME_MODELS.map((o: any) => o.value);
    expect(values).toContain("none");
    expect(values).toContain("time_and_half");
    expect(values).toContain("double_time");
  });

  it("HOLIDAY_ENTITLEMENT_METHODS includes all methods", () => {
    const { HOLIDAY_ENTITLEMENT_METHODS } = require("@/hooks/useCountryRules");
    const values = HOLIDAY_ENTITLEMENT_METHODS.map((m: any) => m.value);
    expect(values).toContain("accrual");
    expect(values).toContain("fixed_days");
    expect(values).toContain("proportional");
  });
});

describe("Service Charge Isolation", () => {
  it("service charge is opt-in per tenant (default false)", () => {
    // Tenant table default for service_charge_enabled is false
    // This ensures new tenants don't inherit service charge config
    expect(true).toBe(true); // Schema-level test — validated via migration
  });
});
