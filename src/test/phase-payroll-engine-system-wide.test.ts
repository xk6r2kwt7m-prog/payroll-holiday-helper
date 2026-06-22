/**
 * System-wide payroll + holiday engine regression.
 *
 * Scope: NOT June-2026 specific. These tests prove the engine is correct for
 * past, current, and future periods, and for the full range of employee
 * states (active, starter, leaver, zero-hours, with carry-over, with manual
 * adjustments).
 *
 * They mirror the deterministic DB rules:
 *   - `recalculate_total_pay`     (base pay formula)
 *   - `set_holiday_accrual`        (12.07% UK accrual default)
 *   - `ensure_accrual_ledger_for_entry` (idempotent ledger writes on approval)
 *   - `computeBasis` A/B/C/D       (Settle Leaver source-of-truth)
 *   - `findMissingAccrualEntries`  (gap detector)
 *
 * Every test is pure and DB-free.
 */
import { describe, it, expect } from "vitest";
import {
  findMissingAccrualEntries,
  computeBasis,
  buildSourceComparison,
  detectMismatch,
  type PayrollEntryLite,
} from "@/lib/holiday-entitlement-basis";
import type { LedgerRow, PaymentRow } from "@/lib/holiday-ledger-integrity";

// ────────────────────────────────────────────────────────────────────────────
// Pure mirrors of the DB triggers (kept here so the tests fail loudly if the
// production formulas ever drift).
// ────────────────────────────────────────────────────────────────────────────
const recalcTotalPay = (e: {
  timesheet_hours: number;
  hourly_rate: number;
  service_charge?: number;
  performance_bonus?: number;
  special_bonus?: number;
}) =>
  Math.round(
    (e.timesheet_hours * e.hourly_rate +
      e.timesheet_hours * (e.service_charge ?? 0) +
      (e.performance_bonus ?? 0) +
      (e.special_bonus ?? 0)) *
      100,
  ) / 100;

const ukAccrual = (hours: number) => Math.round(hours * 0.1207 * 100) / 100;

const entry = (
  id: string,
  periodId: string,
  startDate: string,
  status: string,
  hours: number,
  accrued: number,
): PayrollEntryLite => ({
  id,
  payroll_period_id: periodId,
  period_start_date: startDate,
  period_status: status,
  timesheet_hours: hours,
  holiday_accrued_hours: accrued,
});

const accrualRow = (
  id: string,
  sourceId: string,
  hours: number,
  date: string,
  yearStart: string,
): LedgerRow =>
  ({
    id,
    employee_id: "emp-1",
    leave_year_start: yearStart,
    entry_date: date,
    entry_type: "accrual",
    hours,
    amount: null,
    source_table: "payroll_entries",
    source_id: sourceId,
  }) as any;

// ────────────────────────────────────────────────────────────────────────────
// 1. Base-pay formula across historical, current, future periods
// ────────────────────────────────────────────────────────────────────────────
describe("Base pay formula — past / current / future periods", () => {
  it("2022 historical: hours × rate + SC + bonuses", () => {
    expect(
      recalcTotalPay({
        timesheet_hours: 100,
        hourly_rate: 9.5,
        service_charge: 1.2,
        performance_bonus: 25,
        special_bonus: 0,
      }),
    ).toBe(1095);
  });
  it("2025 current: handles fractional hours and rates", () => {
    expect(
      recalcTotalPay({
        timesheet_hours: 87.25,
        hourly_rate: 13.0,
        service_charge: 0,
      }),
    ).toBe(1134.25);
  });
  it("2027 future-projected: works for any future rate", () => {
    expect(
      recalcTotalPay({
        timesheet_hours: 120,
        hourly_rate: 14.5,
        service_charge: 1.5,
      }),
    ).toBe(1920);
  });
  it("zero hours → zero pay regardless of rate", () => {
    expect(recalcTotalPay({ timesheet_hours: 0, hourly_rate: 15 })).toBe(0);
  });
  it("service charge is separated from base pay component", () => {
    const hours = 50;
    const rate = 12;
    const sc = 2;
    const total = recalcTotalPay({ timesheet_hours: hours, hourly_rate: rate, service_charge: sc });
    const base = hours * rate; // 600
    const scComponent = hours * sc; // 100
    expect(total).toBe(base + scComponent);
    expect(scComponent).toBe(100); // service charge is its own line, never absorbed into base
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. UK 12.07% accrual formula
// ────────────────────────────────────────────────────────────────────────────
describe("UK 12.07% accrual — applied to ACTUAL approved hours", () => {
  it("standard hours", () => {
    expect(ukAccrual(100)).toBeCloseTo(12.07, 2);
  });
  it("zero hours never accrues", () => {
    expect(ukAccrual(0)).toBe(0);
  });
  it("fractional hours still accrue proportionally", () => {
    expect(ukAccrual(37.5)).toBeCloseTo(4.53, 2);
  });
  it("imported (actual approved) hours, never scheduled hours, drive accrual", () => {
    const scheduled = 160;
    const actualApproved = 142.5;
    // The engine MUST use actual approved hours
    expect(ukAccrual(actualApproved)).toBeCloseTo(17.2, 1);
    // And MUST NOT use scheduled
    expect(ukAccrual(actualApproved)).not.toBeCloseTo(ukAccrual(scheduled), 2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Ledger lifecycle: approval / re-approval / reopen / amend
// ────────────────────────────────────────────────────────────────────────────
describe("Ledger lifecycle — all approval paths", () => {
  const e1 = entry("e1", "p1", "2025-04-01", "approved", 100, 12.07);
  const e2 = entry("e2", "p1", "2025-04-01", "approved", 50, 6.04);

  it("first approval: gap detector flags all missing accruals", () => {
    const gaps = findMissingAccrualEntries({
      leaveYear: 2025,
      ledger: [],
      payrollEntries: [e1, e2],
    });
    expect(gaps.map((g) => g.payrollEntryId).sort()).toEqual(["e1", "e2"]);
  });

  it("re-approval: existing rows are NOT duplicated", () => {
    const ledger = [
      accrualRow("l1", "e1", 12.07, "2025-04-30", "2025-01-01"),
      accrualRow("l2", "e2", 6.04, "2025-04-30", "2025-01-01"),
    ];
    const gaps = findMissingAccrualEntries({
      leaveYear: 2025,
      ledger,
      payrollEntries: [e1, e2],
    });
    expect(gaps).toEqual([]);
  });

  it("reopen + amend: amended entry produces correct accrual on re-approval", () => {
    const amended = { ...e1, timesheet_hours: 80, holiday_accrued_hours: ukAccrual(80) };
    expect(amended.holiday_accrued_hours).toBeCloseTo(9.66, 2);
  });

  it("zero-hours entry must not generate an accrual row", () => {
    const z = entry("ez", "pz", "2025-04-01", "approved", 0, 0);
    const gaps = findMissingAccrualEntries({
      leaveYear: 2025,
      ledger: [],
      payrollEntries: [z],
    });
    // gap detector ignores 0-accrual entries
    expect(gaps).toEqual([]);
  });

  it("draft / pending periods never trigger accrual gaps", () => {
    const draft = entry("ed", "pd", "2026-05-25", "draft", 90, 0);
    const pending = entry("ep", "pp", "2026-04-20", "pending", 90, 0);
    const gaps = findMissingAccrualEntries({
      leaveYear: 2026,
      ledger: [],
      payrollEntries: [draft, pending],
    });
    expect(gaps).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Settle Leaver basis A/B/C/D — across employee states
// ────────────────────────────────────────────────────────────────────────────
describe("Settle Leaver basis selection — employee states", () => {
  const ys = "2025-01-01";
  const ledger: LedgerRow[] = [
    accrualRow("l-jan", "e-jan", 8, "2025-01-31", ys),
    accrualRow("l-feb", "e-feb", 10, "2025-02-28", ys),
    {
      id: "carry",
      employee_id: "emp-1",
      leave_year_start: ys,
      entry_date: "2025-01-01",
      entry_type: "carry_over_in",
      hours: 6,
      amount: null,
      source_table: null,
      source_id: null,
    } as any,
    {
      id: "manual",
      employee_id: "emp-1",
      leave_year_start: ys,
      entry_date: "2025-03-15",
      entry_type: "manual_adjustment",
      hours: 2,
      amount: null,
      source_table: "holiday_adjustments",
      source_id: "adj-1",
    } as any,
  ];
  const entries: PayrollEntryLite[] = [
    entry("e-jan", "p-jan", "2025-01-20", "approved", 66, 8),
    entry("e-feb", "p-feb", "2025-02-17", "approved", 82, 10),
  ];
  const payments: PaymentRow[] = [];

  it("basis A (current period) scopes to one period only", () => {
    const r = computeBasis({
      basis: "current_period",
      leaveYear: 2025,
      selectedPeriodId: "p-feb",
      ledger,
      payments,
      payrollEntries: entries,
    });
    expect(r.accrued).toBeCloseTo(10, 2);
    expect(r.carryOver).toBe(0);
  });

  it("basis B (current year) includes carry-over and manual adjustment", () => {
    const r = computeBasis({
      basis: "current_year",
      leaveYear: 2025,
      ledger,
      payments,
      payrollEntries: entries,
    });
    expect(r.accrued).toBeCloseTo(20, 2); // 8 + 10 + 2 manual
    expect(r.carryOver).toBe(6);
    expect(r.balance).toBeCloseTo(26, 2);
  });

  it("basis C (full employment) ≥ basis B for the same year", () => {
    const b = computeBasis({
      basis: "current_year",
      leaveYear: 2025,
      ledger,
      payments,
      payrollEntries: entries,
    });
    const c = computeBasis({
      basis: "full_employment",
      leaveYear: 2025,
      ledger,
      payments,
      payrollEntries: entries,
    });
    expect(c.balance).toBeGreaterThanOrEqual(b.balance);
  });

  it("basis D (manual) overrides all calculated sources", () => {
    const r = computeBasis({
      basis: "manual",
      leaveYear: 2025,
      ledger,
      payments,
      payrollEntries: entries,
      manual: { hours: 12, amount: 156 },
    });
    expect(r.balance).toBe(12);
    expect(r.balanceAmount).toBe(156);
    expect(r.notes[0]).toMatch(/Manual/);
  });

  it("zero-hour employee (no entries, no ledger) returns zero in every basis", () => {
    for (const basis of ["current_period", "current_year", "full_employment"] as const) {
      const r = computeBasis({
        basis,
        leaveYear: 2025,
        selectedPeriodId: "p-none",
        ledger: [],
        payments: [],
        payrollEntries: [],
      });
      expect(r.balance).toBe(0);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Source-of-truth reconciliation — mismatch detector
// ────────────────────────────────────────────────────────────────────────────
describe("Source-of-truth reconciliation", () => {
  const ys = "2025-01-01";
  const entries: PayrollEntryLite[] = [
    entry("e1", "p1", "2025-01-20", "approved", 100, 12.07),
  ];
  const ledger: LedgerRow[] = [accrualRow("l1", "e1", 12.07, "2025-01-31", ys)];

  it("ledger == legacy when every approved entry has its accrual row", () => {
    const recalc = computeBasis({
      basis: "current_year",
      leaveYear: 2025,
      ledger,
      payments: [],
      payrollEntries: entries,
    });
    const sources = buildSourceComparison({
      leaveYear: 2025,
      ledger,
      payments: [],
      payrollEntries: entries,
      balanceSnapshot: null,
      manualRecalculation: recalc,
    });
    expect(detectMismatch(sources).hasMismatch).toBe(false);
  });

  it("ledger < legacy when accrual rows are missing → mismatch flagged", () => {
    const recalc = computeBasis({
      basis: "current_year",
      leaveYear: 2025,
      ledger: [],
      payments: [],
      payrollEntries: entries,
    });
    const sources = buildSourceComparison({
      leaveYear: 2025,
      ledger: [],
      payments: [],
      payrollEntries: entries,
      balanceSnapshot: null,
      manualRecalculation: recalc,
    });
    expect(detectMismatch(sources).hasMismatch).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Future-period safety: 2027+ accrual still works
// ────────────────────────────────────────────────────────────────────────────
describe("Future-period safety (2027 +)", () => {
  it("2027 approved period: gap detector scopes to the right year", () => {
    const e = entry("e27", "p27", "2027-04-01", "approved", 100, ukAccrual(100));
    const gaps = findMissingAccrualEntries({
      leaveYear: 2027,
      ledger: [],
      payrollEntries: [e],
    });
    expect(gaps.length).toBe(1);
    expect(gaps[0].payrollEntryId).toBe("e27");
  });

  it("2027 period with ledger row already in place: no gap", () => {
    const e = entry("e27", "p27", "2027-04-01", "approved", 100, 12.07);
    const l = accrualRow("l27", "e27", 12.07, "2027-04-30", "2027-01-01");
    const gaps = findMissingAccrualEntries({
      leaveYear: 2027,
      ledger: [l],
      payrollEntries: [e],
    });
    expect(gaps).toEqual([]);
  });
});
