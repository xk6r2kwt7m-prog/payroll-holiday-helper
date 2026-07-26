/**
 * Phase C — Payroll table filters, badges, and drawer synthesis.
 *
 * These are pure-function tests. No React rendering, no DB.
 * Phase C is UI/presentation only — this file guards the deterministic
 * bucketing logic that powers the filter chips, row badges, and drawer
 * fallback. Payroll calculation, NMW, service charge, holiday, import,
 * approval, audit and PDF logic are NOT tested here (they are covered by
 * earlier phases) and are NOT modified by this phase.
 */
import { describe, it, expect } from "vitest";
import {
  filterEntries,
  entryMatchesFilter,
  computeRowBadges,
  synthesizeZeroChange,
  PAYROLL_TABLE_FILTERS,
} from "@/lib/payroll-table-filters";
import type { EmployeeChange } from "@/lib/payroll-change-review";

function makeEntry(overrides: Partial<any> = {}) {
  return {
    id: "e1",
    employee_id: "u1",
    timesheet_hours: 40,
    holiday_accrued_hours: 0,
    adjustment_note: null,
    imported_hours: 40,
    ...overrides,
  };
}

function makeChange(overrides: Partial<any> = {}): EmployeeChange {
  return {
    employee_id: "u1",
    entry_id: "e1",
    is_new_starter: false,
    is_leaver: false,
    rate: { prev: 12, curr: 12, diff: 0, pct: null, changed: false, severity: "none" },
    service_charge: { prev: 1, curr: 1, diff: 0, pct: null, changed: false, severity: "none" },
    bonus: { prev: 0, curr: 0, diff: 0, pct: null, changed: false, severity: "none" },
    holiday_pay: { prev: 0, curr: 0, diff: 0, pct: null, changed: false, severity: "none" },
    gross_pay: { prev: 480, curr: 480, diff: 0, pct: null, changed: false, severity: "none" },
    hours: {
      prev_total: 40,
      curr_total: 40,
      prev_weeks: 4,
      curr_weeks: 4,
      prev_weekly_avg: 10,
      curr_weekly_avg: 10,
      pct_weekly_change: 0,
      severity: "none",
      zero_hours_but_had_hours: false,
      missing_from_timesheet: false,
    },
    manual_adjustment_count: 0,
    overall_severity: "none",
    ...overrides,
  } as EmployeeChange;
}

describe("Phase C — PAYROLL_TABLE_FILTERS registry", () => {
  it("registers exactly the seven filter buckets required by spec", () => {
    expect(PAYROLL_TABLE_FILTERS.map((f) => f.id)).toEqual([
      "all",
      "issues",
      "pay_changes",
      "zero_hours",
      "holiday_pay",
      "manual_adjustments",
      "missing_timesheet",
    ]);
  });
});

describe("Phase C — filterEntries", () => {
  const entries = [
    makeEntry({ id: "e1", employee_id: "u1", timesheet_hours: 40 }),
    makeEntry({ id: "e2", employee_id: "u2", timesheet_hours: 0, imported_hours: 0 }),
    makeEntry({ id: "e3", employee_id: "u3", timesheet_hours: 30, imported_hours: 25 }),
    makeEntry({ id: "e4", employee_id: "u4", holiday_accrued_hours: 12 }),
    makeEntry({ id: "e5", employee_id: "u5" }),
  ];

  it("'all' returns every entry", () => {
    expect(filterEntries(entries, "all", {}).length).toBe(5);
  });

  it("'zero_hours' returns only entries with 0 hours", () => {
    const out = filterEntries(entries, "zero_hours", {});
    expect(out.map((e) => e.id)).toEqual(["e2"]);
  });

  it("'manual_adjustments' picks entries where imported vs timesheet differ", () => {
    const out = filterEntries(entries, "manual_adjustments", {});
    expect(out.map((e) => e.id)).toEqual(["e3"]);
  });

  it("'holiday_pay' matches entries with accrued hours or a paid-holiday id set", () => {
    const paid = new Set<string>(["u5"]);
    const out = filterEntries(entries, "holiday_pay", { holidayPaidEmployeeIds: paid });
    expect(out.map((e) => e.id).sort()).toEqual(["e4", "e5"]);
  });

  it("'pay_changes' picks employees with a rate or SC change in comparison map", () => {
    const cmp = new Map<string, EmployeeChange>();
    cmp.set(
      "u1",
      makeChange({
        rate: { prev: 12, curr: 13, diff: 1, pct: 8.3, changed: true, severity: "amber" },
      }),
    );
    cmp.set(
      "u3",
      makeChange({
        service_charge: { prev: 1, curr: 2, diff: 1, pct: 100, changed: true, severity: "amber" },
      }),
    );
    const out = filterEntries(entries, "pay_changes", { comparisonByEmployee: cmp });
    expect(out.map((e) => e.id).sort()).toEqual(["e1", "e3"]);
  });

  it("'missing_timesheet' picks entries flagged missing in the comparison map", () => {
    const cmp = new Map<string, EmployeeChange>();
    cmp.set(
      "u4",
      makeChange({
        hours: {
          prev_total: 30,
          curr_total: 0,
          prev_weeks: 4,
          curr_weeks: 4,
          prev_weekly_avg: 7.5,
          curr_weekly_avg: 0,
          pct_weekly_change: -100,
          severity: "red",
          zero_hours_but_had_hours: true,
          missing_from_timesheet: true,
        },
      }),
    );
    const out = filterEntries(entries, "missing_timesheet", { comparisonByEmployee: cmp });
    expect(out.map((e) => e.id)).toEqual(["e4"]);
  });

  it("'issues' unions severity, NMW risk/fail, zero hours, manual adj and missing timesheet", () => {
    const cmp = new Map<string, EmployeeChange>();
    cmp.set(
      "u1",
      makeChange({
        rate: { prev: 12, curr: 15, diff: 3, pct: 25, changed: true, severity: "red" },
        overall_severity: "red",
      }),
    );
    const nmw = new Map<string, "compliant" | "at_risk" | "non_compliant">([
      ["u5", "non_compliant"],
    ]);
    const out = filterEntries(entries, "issues", {
      comparisonByEmployee: cmp,
      nmwStatusByEmployee: nmw,
    });
    // e1 severe, e2 zero hours, e3 manual adjustment, e5 NMW fail
    expect(out.map((e) => e.id).sort()).toEqual(["e1", "e2", "e3", "e5"]);
  });

  it("ordinary hour movement (severity=none) is NOT treated as an issue", () => {
    const cmp = new Map<string, EmployeeChange>();
    cmp.set(
      "u1",
      makeChange({
        hours: {
          prev_total: 40,
          curr_total: 42,
          prev_weeks: 4,
          curr_weeks: 4,
          prev_weekly_avg: 10,
          curr_weekly_avg: 10.5,
          pct_weekly_change: 5,
          severity: "none",
          zero_hours_but_had_hours: false,
          missing_from_timesheet: false,
        },
      }),
    );
    const stableEntries = [makeEntry({ id: "e1", employee_id: "u1", timesheet_hours: 42, imported_hours: 42 })];
    expect(entryMatchesFilter(stableEntries[0], "issues", { comparisonByEmployee: cmp })).toBe(false);
  });
});

describe("Phase C — computeRowBadges", () => {
  it("returns no chips for a clean entry with no comparison", () => {
    const b = computeRowBadges(makeEntry({ timesheet_hours: 40, imported_hours: 40 }), {});
    expect(b).toMatchObject({
      rateChanged: false,
      scChanged: false,
      missingTimesheet: false,
      zeroHours: false,
      holidayPay: false,
      manualAdjustment: false,
      nmwAtRisk: false,
      nmwFail: false,
      internalNote: false,
    });
  });

  it("marks rate change, SC change and manual adjustment when signalled", () => {
    const cmp = new Map<string, EmployeeChange>();
    cmp.set(
      "u1",
      makeChange({
        rate: { prev: 12, curr: 13, diff: 1, pct: 8.3, changed: true, severity: "amber" },
        service_charge: { prev: 1, curr: 2, diff: 1, pct: 100, changed: true, severity: "amber" },
      }),
    );
    const b = computeRowBadges(
      makeEntry({ imported_hours: 25, timesheet_hours: 30, adjustment_note: "correction" }),
      { comparisonByEmployee: cmp },
    );
    expect(b.rateChanged).toBe(true);
    expect(b.scChanged).toBe(true);
    expect(b.manualAdjustment).toBe(true);
    expect(b.internalNote).toBe(true);
  });

  it("marks missing timesheet and zero hours when applicable", () => {
    const cmp = new Map<string, EmployeeChange>();
    cmp.set(
      "u1",
      makeChange({
        hours: {
          prev_total: 30,
          curr_total: 0,
          prev_weeks: 4,
          curr_weeks: 4,
          prev_weekly_avg: 7.5,
          curr_weekly_avg: 0,
          pct_weekly_change: -100,
          severity: "red",
          zero_hours_but_had_hours: true,
          missing_from_timesheet: true,
        },
      }),
    );
    const b = computeRowBadges(makeEntry({ timesheet_hours: 0 }), { comparisonByEmployee: cmp });
    expect(b.missingTimesheet).toBe(true);
    expect(b.zeroHours).toBe(true);
  });

  it("marks NMW at-risk and NMW fail from status map", () => {
    const nmw = new Map<string, "compliant" | "at_risk" | "non_compliant">([
      ["u1", "at_risk"],
    ]);
    const b1 = computeRowBadges(makeEntry(), { nmwStatusByEmployee: nmw });
    expect(b1.nmwAtRisk).toBe(true);
    expect(b1.nmwFail).toBe(false);

    const nmw2 = new Map<string, "compliant" | "at_risk" | "non_compliant">([
      ["u1", "non_compliant"],
    ]);
    const b2 = computeRowBadges(makeEntry(), { nmwStatusByEmployee: nmw2 });
    expect(b2.nmwFail).toBe(true);
    expect(b2.highRisk).toBe(true);
  });

  it("marks holiday pay from paid set or accrued hours", () => {
    const b1 = computeRowBadges(makeEntry({ holiday_accrued_hours: 6 }), {});
    expect(b1.holidayPay).toBe(true);
    const b2 = computeRowBadges(makeEntry({ holiday_accrued_hours: 0 }), {
      holidayPaidEmployeeIds: new Set(["u1"]),
    });
    expect(b2.holidayPay).toBe(true);
  });
});

describe("Phase C — synthesizeZeroChange (drawer fallback)", () => {
  it("produces a zero-diff change usable by the review dialog", () => {
    const change = synthesizeZeroChange({
      employee_id: "u1",
      entry_id: "e1",
      hourly_rate: 12.5,
      service_charge: 1.25,
      timesheet_hours: 42,
      holiday_pay: 0,
      bonus: 50,
      gross_pay: 575,
    });
    expect(change.rate.prev).toBe(12.5);
    expect(change.rate.curr).toBe(12.5);
    expect(change.rate.changed).toBe(false);
    expect(change.overall_severity).toBe("none");
    expect(change.hours.severity).toBe("none");
    expect(change.hours.prev_total).toBe(42);
    expect(change.manual_adjustment_count).toBe(0);
  });
});

describe("Phase C — page structure guardrails", () => {
  it("payroll table sits before the collapsed detail sections in Payroll.tsx", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/pages/Payroll.tsx", "utf8");
    const tableIdx = src.indexOf("<EditablePayrollTable");
    const holidayIdx = src.indexOf('testId="collapsible-holiday-pay"');
    const salesIdx = src.indexOf('testId="collapsible-sales-labour"');
    const analyticsIdx = src.indexOf('testId="collapsible-period-analytics"');
    expect(tableIdx).toBeGreaterThan(0);
    expect(tableIdx).toBeLessThan(holidayIdx);
    expect(tableIdx).toBeLessThan(salesIdx);
    expect(tableIdx).toBeLessThan(analyticsIdx);
  });

  it("payroll table appears exactly once in Payroll.tsx (no duplicate render)", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/pages/Payroll.tsx", "utf8");
    const matches = src.match(/<EditablePayrollTable/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("EditablePayrollTable renders filter chips and sticky Employee column", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/components/payroll/EditablePayrollTable.tsx", "utf8");
    expect(src).toContain('data-testid="payroll-table-filters"');
    expect(src).toMatch(/data-testid=\{`payroll-filter-\$\{f\.id\}`\}/);
    expect(src).toMatch(/sticky left-0/);
    // Details button (drawer entry point) is present.
    expect(src).toMatch(/row-details-\$\{entry\.employee_id\}/);
  });
});
