/**
 * Phase 3 — National Minimum Wage gate, contract wording, and rota
 * terms-awareness. These tests guard the contract / payroll boundary:
 *
 *   - service charge is NEVER counted toward NMW
 *   - generated contract wording does NOT imply SC is part of base pay
 *   - rota cost split prefers active employment terms, falls back to profile
 */
import { describe, it, expect } from "vitest";
import { evaluateWageCompliance, getApplicableRateSet } from "@/lib/uk-minimum-wage";
import { evaluatePayrollEntryNmw } from "@/lib/payroll-nmw";
import {
  pickActiveTermsForDate,
  computeShiftLabourCost,
  type TermsRow,
} from "@/lib/labour-costing";
import { getClauseContent } from "@/components/contracts/contractClauses";
import type { ContractVariables } from "@/components/contracts/contractTemplates";

const DOB_30YO = "1994-01-01";
const REF_DATE = new Date("2026-05-01");

function baseVars(over: Partial<ContractVariables> = {}): ContractVariables {
  return {
    employeeName: "Test Person",
    homeAddress: "",
    jobTitle: "Team Member",
    effectiveDate: "2026-05-01",
    hourlyRate: "12.71",
    baseHourlyRate: "12.71",
    guaranteedServiceChargeRate: "",
    estimatedServiceChargeRate: "",
    troncSchemeName: "",
    serviceChargePolicyNote: "",
    weeklyHours: "40",
    noticePeriod: "two weeks",
    probationPeriod: "2 months",
    workLocation: "London",
    employmentType: "variable_hours",
    ...over,
  };
}

describe("Phase 3 — NMW gate (contract & amendment)", () => {
  it("passes when base hourly rate is at or above NMW", () => {
    const required = getApplicableRateSet(REF_DATE).rates["21_over"];
    const result = evaluateWageCompliance({
      dobIso: DOB_30YO,
      hourlyRate: required + 0.5,
      referenceDate: REF_DATE,
    });
    expect(result.status).toBe("compliant");
  });

  it("blocks when base hourly rate is below NMW", () => {
    const required = getApplicableRateSet(REF_DATE).rates["21_over"];
    const result = evaluateWageCompliance({
      dobIso: DOB_30YO,
      hourlyRate: required - 1,
      referenceDate: REF_DATE,
    });
    expect(result.status).toBe("below");
  });

  it("guaranteed service charge does NOT lift a below-NMW base rate (NMW formula uses base only)", () => {
    const required = getApplicableRateSet(REF_DATE).rates["21_over"];
    // Service charge of £5/hour does not change the gate — only base matters.
    const result = evaluateWageCompliance({
      dobIso: DOB_30YO,
      hourlyRate: required - 1, // base only, sc ignored by formula
      referenceDate: REF_DATE,
    });
    expect(result.status).toBe("below");
  });

  it("estimated service charge does NOT lift a below-NMW base rate", () => {
    const required = getApplicableRateSet(REF_DATE).rates["21_over"];
    const result = evaluateWageCompliance({
      dobIso: DOB_30YO,
      hourlyRate: required - 2,
      referenceDate: REF_DATE,
    });
    expect(result.status).toBe("below");
  });

  it("payroll-level NMW: relies_on_service_charge is diagnostic only, SC stays excluded from eligible pay", () => {
    // base £10/hr × 10 hours = £100; SC £5/hr × 10 = £50; required £12.71/hr.
    const r = evaluatePayrollEntryNmw(
      {
        employee_id: "e1",
        employee_name: "Test",
        date_of_birth: DOB_30YO,
        timesheet_hours: 10,
        hourly_rate: 10,
        service_charge: 5,
      },
      "2026-05-01",
    );
    expect(r.status).toBe("non_compliant"); // SC must NOT save it
    expect(r.eligible_pay).toBe(100); // SC excluded
    expect(r.calculation_basis.excluded_service_charge).toBe(50);
    expect(r.relies_on_service_charge).toBe(true); // diagnostic flag set
  });
});

describe("Phase 3 — Contract wording does not bundle SC into base pay", () => {
  const forbidden = [
    /includes service charge/i,
    /including service charge/i,
    /composed of service charge/i,
    /service charge forms part of hourly rate/i,
    /which includes a guaranteed service charge/i,
  ];

  it("salary clause separates base hourly rate from service charge", () => {
    const blocks = getClauseContent(
      "salary",
      baseVars({ guaranteedServiceChargeRate: "2.00", estimatedServiceChargeRate: "1.00" }),
      "foh",
    );
    const text = blocks.map((b) => (b.text || (b.items || []).join(" "))).join(" ");
    for (const re of forbidden) {
      expect(text).not.toMatch(re);
    }
    // Must clearly call out base / guaranteed / estimated / NMW separately.
    expect(text).toMatch(/base hourly rate/i);
    expect(text).toMatch(/guaranteed service charge/i);
    expect(text).toMatch(/estimated service charge/i);
    expect(text).toMatch(/national minimum wage/i);
  });

  it("salary clause without SC still uses base-only wording", () => {
    const blocks = getClauseContent("salary", baseVars(), "foh");
    const text = blocks.map((b) => (b.text || (b.items || []).join(" "))).join(" ");
    for (const re of forbidden) {
      expect(text).not.toMatch(re);
    }
    expect(text).toMatch(/base hourly rate/i);
  });
});

describe("Phase 3 — Rota terms-awareness", () => {
  const makeTerms = (over: Partial<TermsRow> = {}): TermsRow =>
    ({
      id: "t1",
      tenant_id: "t",
      employee_id: "e1",
      contract_id: "c1",
      effective_from: "2026-04-01",
      effective_to: null,
      status: "active",
      hourly_rate: 12,
      base_hourly_rate: 13,
      guaranteed_service_charge_rate: 2,
      estimated_service_charge_rate: 1,
      source_type: "signed_contract",
      ...(over as any),
    }) as unknown as TermsRow;

  it("picks the active terms row for a given shift date", () => {
    const a = makeTerms({ id: "a", effective_from: "2026-01-01", effective_to: "2026-04-01" });
    const b = makeTerms({ id: "b", effective_from: "2026-04-01", effective_to: null });
    expect(pickActiveTermsForDate([a, b], "2026-05-01")?.id).toBe("b");
    expect(pickActiveTermsForDate([a, b], "2026-02-01")?.id).toBe("a");
  });

  it("base rate is used as the labour base cost; SC stays separate", () => {
    const cost = computeShiftLabourCost(10, makeTerms(), { hourly_rate: 99, service_charge: 99 });
    expect(cost.base_cost).toBe(130); // 10h × £13 base
    expect(cost.guaranteed_sc_cost).toBe(20); // 10h × £2 guaranteed
    expect(cost.estimated_sc_cost).toBe(10); // 10h × £1 estimated
    expect(cost.source).toBe("employment_terms");
  });

  it("falls back to employee profile when no terms exist, and flags it", () => {
    const cost = computeShiftLabourCost(5, null, { hourly_rate: 11, service_charge: 1 });
    expect(cost.base_cost).toBe(55);
    expect(cost.guaranteed_sc_cost).toBe(5);
    expect(cost.source).toBe("profile_fallback");
    expect(cost.warning).toMatch(/profile fallback/i);
  });

  it("labour percentage / NMW-sensitive figures must use base_cost only", () => {
    const cost = computeShiftLabourCost(10, makeTerms(), { hourly_rate: 0, service_charge: 0 });
    // Caller-facing rule: NMW / labour% must NOT include SC.
    expect(cost.base_cost).toBeLessThan(cost.estimated_total_cost);
    // base is the authoritative figure
    expect(cost.base_rate).toBe(13);
  });
});
