import { describe, it, expect } from "vitest";
import { evaluatePayrollEntryNmw, summariseNmw } from "@/lib/payroll-nmw";
import {
  isRelevantToPayrollPeriod,
  isFutureStarterAfterPeriod,
} from "@/lib/employee-period-relevance";

const PERIOD = { start_date: "2026-09-01", end_date: "2026-09-30" };

function entry(over: Partial<Parameters<typeof evaluatePayrollEntryNmw>[0]> = {}) {
  return evaluatePayrollEntryNmw(
    {
      employee_id: "e1",
      employee_name: "Test Person",
      date_of_birth: "1990-01-01",
      timesheet_hours: 100,
      hourly_rate: 12.71,
      ...over,
    },
    PERIOD.start_date,
  );
}

describe("period inclusion", () => {
  it("excludes future starters", () => {
    const emp = { id: "a", status: "starter", start_date: "2026-10-15" };
    expect(isFutureStarterAfterPeriod(emp, PERIOD)).toBe(true);
    expect(isRelevantToPayrollPeriod(emp, PERIOD)).toBe(false);
  });

  it("excludes a leaver who left before the period with nothing due", () => {
    const emp = { id: "b", status: "leaver", end_date: "2026-07-31" };
    expect(isRelevantToPayrollPeriod(emp, PERIOD)).toBe(false);
  });

  it("includes a leaver who left before the period but has a payment due", () => {
    const emp = { id: "b", status: "leaver", end_date: "2026-07-31" };
    expect(
      isRelevantToPayrollPeriod(emp, PERIOD, { entryEmployeeIds: new Set(["b"]) }),
    ).toBe(true);
  });

  it("includes an employee active during the period", () => {
    expect(
      isRelevantToPayrollPeriod({ id: "c", status: "active", start_date: "2025-01-01" }, PERIOD),
    ).toBe(true);
  });
});

describe("minimum wage check", () => {
  it("treats pay at exactly the legal rate as compliant, not at risk", () => {
    const r = entry({ timesheet_hours: 95.49, hourly_rate: 12.71 });
    expect(r.status).toBe("compliant");
    expect(r.message).toContain("exactly the legal minimum");
  });

  it("uses the 18-20 band rate", () => {
    const r = entry({ date_of_birth: "2007-01-01", hourly_rate: 10.85 });
    expect(r.required_rate).toBe(10.85);
    expect(r.status).toBe("compliant");
  });

  it("uses the apprentice rate for a qualifying apprentice", () => {
    const r = entry({
      date_of_birth: "2009-01-01",
      is_apprentice: true,
      hourly_rate: 8.0,
    });
    expect(r.age_band).toBe("apprentice");
    expect(r.required_rate).toBe(8.0);
    expect(r.status).toBe("compliant");
  });

  it("reports information missing when the base rate is absent, never non-compliant", () => {
    const r = entry({ hourly_rate: 0, timesheet_hours: 108.42 });
    expect(r.status).toBe("insufficient_data");
    expect(r.missing).toContain("base_rate");
    expect(r.message).toContain("Information missing");
  });

  it("reports information missing when date of birth is absent", () => {
    const r = entry({ date_of_birth: null });
    expect(r.status).toBe("insufficient_data");
    expect(r.missing).toContain("date_of_birth");
  });

  it("reports information missing when apprenticeship status is unknown under 19", () => {
    const r = entry({ date_of_birth: "2009-01-01", apprentice_status_known: false });
    expect(r.status).toBe("insufficient_data");
    expect(r.missing).toContain("apprentice_status");
  });

  it("never counts service charge towards minimum wage", () => {
    const r = entry({ hourly_rate: 11.5, service_charge: 2 });
    expect(r.status).toBe("non_compliant");
    expect(r.calculation_basis.excluded_service_charge).toBe(2);
  });

  it("reports a contract rate mismatch separately from the status", () => {
    const r = entry({ hourly_rate: 13, contracted_rate: 12.5 });
    expect(r.status).toBe("compliant");
    expect(r.contract_rate_mismatch).toBe(true);
    expect(summariseNmw([r]).contract_rate_mismatch).toBe(1);
    expect(summariseNmw([r]).hasBlockers).toBe(false);
  });
});
