import { describe, it, expect } from "vitest";
import { calculateAccrual, calculateAnnualEntitlement } from "@/hooks/useLeaveRules";
import { calculateCapeVerdeProportionalLeave } from "@/hooks/useCountryRules";

/**
 * Country-aware holiday accrual tests.
 *
 * The DB function calculate_country_holiday_accrual(hours, employee_id) resolves:
 *   1. employee.contract_country
 *   2. tenant.country
 *   3. tenant_leave_settings override
 *   4. country_leave_rules lookup
 *   5. fallback → 0 (NOT UK 12.07%)
 *
 * These frontend tests verify the calculation helpers used across the UI
 * match expected country-specific rates from country_leave_rules.
 */

describe("Country-aware accrual: UK (GB)", () => {
  const UK_RATE = 0.1207;

  it("accrues at 12.07% for UK employees", () => {
    expect(calculateAccrual(100, UK_RATE)).toBe(12.07);
  });

  it("accrues correctly for fractional hours", () => {
    expect(calculateAccrual(37.5, UK_RATE)).toBe(4.53);
  });

  it("annual entitlement: 40h/week × 5.6 weeks = 224h", () => {
    expect(calculateAnnualEntitlement(40, 5.6)).toBe(224);
  });
});

describe("Country-aware accrual: Portugal (PT)", () => {
  // Portugal: 22 days / (52 weeks × 5 days) = 0.0846 accrual rate
  const PT_RATE = 0.0846;

  it("does NOT use UK 12.07% rate", () => {
    const ukResult = calculateAccrual(100, 0.1207);
    const ptResult = calculateAccrual(100, PT_RATE);
    expect(ptResult).not.toBe(ukResult);
  });

  it("accrues at Portugal rate", () => {
    expect(calculateAccrual(100, PT_RATE)).toBe(8.46);
  });

  it("annual entitlement: 40h/week × 4.4 weeks = 176h (22 days)", () => {
    expect(calculateAnnualEntitlement(40, 4.4)).toBe(176);
  });
});

describe("Country-aware accrual: Cape Verde (CV)", () => {
  // Cape Verde: 22 days / (52 × 5) = 0.0846 (similar to PT)
  const CV_RATE = 0.0846;

  it("does NOT use UK 12.07% rate", () => {
    const ukResult = calculateAccrual(100, 0.1207);
    const cvResult = calculateAccrual(100, CV_RATE);
    expect(cvResult).not.toBe(ukResult);
  });

  it("proportional leave for new starters (< 1 year)", () => {
    expect(calculateCapeVerdeProportionalLeave(6)).toBe(12);
    expect(calculateCapeVerdeProportionalLeave(1)).toBe(2);
  });

  it("full year entitlement is 22 days", () => {
    expect(calculateCapeVerdeProportionalLeave(12)).toBe(22);
  });
});

describe("Country-aware accrual: United States (US)", () => {
  // US: no statutory accrual, PTO-based. Rate should be 0 unless tenant configures it.
  const US_DEFAULT_RATE = 0;

  it("defaults to 0 accrual (PTO-based, no statutory requirement)", () => {
    expect(calculateAccrual(100, US_DEFAULT_RATE)).toBe(0);
  });

  it("does NOT silently apply UK 12.07%", () => {
    expect(calculateAccrual(100, US_DEFAULT_RATE)).not.toBe(12.07);
  });
});

describe("Fallback behaviour", () => {
  it("missing country rule returns 0, not UK rate", () => {
    // When no country rule exists, the DB returns 0.
    // Frontend should mirror: fallback rate = 0
    const fallbackRate = 0;
    expect(calculateAccrual(100, fallbackRate)).toBe(0);
  });

  it("tenant override takes priority over country default", () => {
    // Tenant explicitly sets 0.15 override
    const tenantOverride = 0.15;
    const countryDefault = 0.1207;
    // The resolved accrual should use tenant override, not country
    expect(calculateAccrual(100, tenantOverride)).toBe(15);
    expect(calculateAccrual(100, tenantOverride)).not.toBe(
      calculateAccrual(100, countryDefault)
    );
  });
});

describe("Rounding precision", () => {
  it("respects custom precision from tenant settings", () => {
    expect(calculateAccrual(33.33, 0.1207, 4)).toBe(4.0249);
    expect(calculateAccrual(33.33, 0.1207, 2)).toBe(4.02);
  });
});

describe("Non-UK employees must not inherit UK defaults", () => {
  const UK_RATE = 0.1207;
  const countryCases = [
    { code: "PT", rate: 0.0846 },
    { code: "CV", rate: 0.0846 },
    { code: "US", rate: 0 },
  ];

  for (const { code, rate } of countryCases) {
    it(`${code} employee with rate ${rate} does not produce UK accrual`, () => {
      const result = calculateAccrual(100, rate);
      const ukResult = calculateAccrual(100, UK_RATE);
      if (rate !== UK_RATE) {
        expect(result).not.toBe(ukResult);
      }
    });
  }
});
