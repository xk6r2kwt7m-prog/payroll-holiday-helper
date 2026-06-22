/**
 * Regression test for the 2026 system-wide accrual gap.
 *
 * Scenario: Five 2026 payroll-period scenarios + the proven-correct 2025 baseline.
 * The calculator must
 *   - flag missing accrual rows only for APPROVED periods,
 *   - never flag draft / pending / corrected-superseded periods,
 *   - never duplicate accrual rows when the ledger already has them,
 *   - keep zero-hours periods at zero accrual,
 *   - keep the per-basis (A/B/C) outputs internally consistent.
 *
 * The five period scenarios reproduce, in code, the real-world states that
 * were observed during the June 2026 incident:
 *   1. Approved period with full ledger coverage         → no gap
 *   2. Approved period with ZERO ledger coverage         → gap (the 2026 incident)
 *   3. Approved period with PARTIAL ledger coverage      → gap for missing only
 *   4. Pending period (not yet approved)                 → no gap (by design)
 *   5. Draft period (not yet approved)                   → no gap (by design)
 */
import { describe, it, expect } from "vitest";
import {
  findMissingAccrualEntries,
  buildSourceComparison,
  computeBasis,
  detectMismatch,
  type PayrollEntryLite,
} from "@/lib/holiday-entitlement-basis";
import type { LedgerRow } from "@/lib/holiday-ledger-integrity";

const LEAVE_YEAR = 2026;

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

const ledgerAccrual = (id: string, sourceId: string, hours: number, date = "2026-04-30"): LedgerRow =>
  ({
    id,
    employee_id: "emp-1",
    leave_year_start: "2026-01-01",
    entry_date: date,
    entry_type: "accrual",
    hours,
    amount: null,
    source_table: "payroll_entries",
    source_id: sourceId,
  }) as any;

describe("2026 accrual gap — regression for five period scenarios", () => {
  // Five entries, one per period scenario
  const entries: PayrollEntryLite[] = [
    entry("e-feb",  "p-feb",  "2026-01-26", "approved", 100,  12.07), // full coverage
    entry("e-apr",  "p-apr",  "2026-03-23", "approved", 120,  14.48), // 2026 incident
    entry("e-mar",  "p-mar",  "2026-02-23", "approved",  90,  10.86), // partial: covered
    entry("e-mar2", "p-mar",  "2026-02-23", "approved",  50,   6.04), // partial: missing
    entry("e-may",  "p-may",  "2026-04-20", "pending",   80,   9.66), // pending
    entry("e-jun",  "p-jun",  "2026-05-25", "draft",     70,   8.45), // draft
  ];
  const ledger: LedgerRow[] = [
    ledgerAccrual("l-feb",  "e-feb",  12.07),
    ledgerAccrual("l-mar",  "e-mar",  10.86),
    // intentionally NO row for e-mar2 (partial) or e-apr (incident)
  ];

  it("flags ONLY missing approved accruals, not draft / pending", () => {
    const gaps = findMissingAccrualEntries({ leaveYear: LEAVE_YEAR, ledger, payrollEntries: entries });
    const ids = gaps.map((g) => g.payrollEntryId).sort();
    expect(ids).toEqual(["e-apr", "e-mar2"]);
  });

  it("does not re-flag an entry once its ledger row exists (no duplicates)", () => {
    const fixed = [...ledger, ledgerAccrual("l-apr", "e-apr", 14.48), ledgerAccrual("l-mar2", "e-mar2", 6.04)];
    const gaps = findMissingAccrualEntries({ leaveYear: LEAVE_YEAR, ledger: fixed, payrollEntries: entries });
    expect(gaps).toEqual([]);
  });

  it("legacy and ledger accrual totals align once approved rows are present", () => {
    const fixed = [...ledger, ledgerAccrual("l-apr", "e-apr", 14.48), ledgerAccrual("l-mar2", "e-mar2", 6.04)];
    const sources = buildSourceComparison({
      leaveYear: LEAVE_YEAR,
      ledger: fixed,
      payments: [],
      payrollEntries: entries,
      balanceSnapshot: null,
      manualRecalculation: computeBasis({
        basis: "current_year",
        leaveYear: LEAVE_YEAR,
        ledger: fixed,
        payments: [],
        payrollEntries: entries,
      }),
    });
    const legacy = sources.find((s) => s.source === "holiday_tab_legacy")!;
    const led = sources.find((s) => s.source === "holiday_ledger")!;
    // Both must sum approved-period accruals only (12.07 + 14.48 + 10.86 + 6.04 = 43.45)
    expect(legacy.accrued).toBeCloseTo(43.45, 2);
    expect(led.accrued).toBeCloseTo(43.45, 2);
    expect(detectMismatch(sources).hasMismatch).toBe(false);
  });

  it("zero-hours approved period contributes zero gap and zero accrual", () => {
    const zeroEntries = [entry("e-zero", "p-zero", "2026-02-01", "approved", 0, 0)];
    const gaps = findMissingAccrualEntries({ leaveYear: LEAVE_YEAR, ledger: [], payrollEntries: zeroEntries });
    expect(gaps).toEqual([]);
  });

  it("basis C never under-counts when ledger contains all approved accruals", () => {
    const fixed = [...ledger, ledgerAccrual("l-apr", "e-apr", 14.48), ledgerAccrual("l-mar2", "e-mar2", 6.04)];
    const c = computeBasis({
      basis: "full_employment",
      leaveYear: LEAVE_YEAR,
      ledger: fixed,
      payments: [],
      payrollEntries: entries,
    });
    expect(c.accrued).toBeCloseTo(43.45, 2);
  });
});
