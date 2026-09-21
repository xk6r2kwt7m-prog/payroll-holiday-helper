import { describe, it, expect } from "vitest";
import { evaluatePayrollEntryNmw } from "@/lib/payroll-nmw";

const PERIOD_START = "2026-08-01";

function entry(over: Partial<Parameters<typeof evaluatePayrollEntryNmw>[0]> = {}) {
  return evaluatePayrollEntryNmw(
    {
      employee_id: "e1",
      employee_name: "Test Person",
      date_of_birth: "1990-01-01",
      timesheet_hours: 95.49,
      hourly_rate: 12.71,
      service_charge: 1,
      performance_bonus: 0,
      special_bonus: 0,
      ...over,
    },
    PERIOD_START,
  );
}

describe("NMW — sub-penny rounding must not report underpayment", () => {
  it("treats pay at exactly the legal minimum as compliant, not non-compliant", () => {
    const r = entry();
    expect(r.status).not.toBe("non_compliant");
    expect(r.shortfall).toBe(0);
    expect(r.relies_on_service_charge).toBe(false);
  });

  it.each([
    [95.49, 12.71, "1990-01-01"],
    [80.84, 12.71, "1990-01-01"],
    [112.79, 12.71, "1990-01-01"],
    [41.88, 12.71, "1990-01-01"],
    [64.67, 11.0, "2008-06-04"],
    [18.78, 11.0, "2007-07-16"],
  ])("hours %s at rate %s is never flagged short", (hours, rate, dob) => {
    const r = entry({ timesheet_hours: hours, hourly_rate: rate, date_of_birth: dob });
    expect(r.status).not.toBe("non_compliant");
  });

  it("still flags a genuine shortfall of a penny or more", () => {
    const r = entry({ hourly_rate: 12.6 });
    expect(r.status).toBe("non_compliant");
    expect(r.shortfall).toBeGreaterThan(0);
  });

  it("reports a missing hourly rate as information missing, not non-compliant", () => {
    const r = entry({ timesheet_hours: 23.07, hourly_rate: 0, service_charge: 0 });
    expect(r.status).toBe("insufficient_data");
    expect(r.missing).toContain("base_rate");
    expect(r.shortfall).toBe(0);
  });

  it("only flags reliance on service charge when there is a real shortfall", () => {
    const r = entry({ hourly_rate: 12.0, service_charge: 2 });
    expect(r.status).toBe("non_compliant");
    expect(r.relies_on_service_charge).toBe(true);
  });
});
