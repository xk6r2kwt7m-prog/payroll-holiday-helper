import { describe, expect, it } from "vitest";
import {
  computeBasis,
  buildSourceComparison,
  detectMismatch,
  findMissingAccrualEntries,
  type PayrollEntryLite,
  type BalanceSnapshotRow,
} from "@/lib/holiday-entitlement-basis";
import type { LedgerRow, PaymentRow } from "@/lib/holiday-ledger-integrity";

// Reconstruct Kazumi's real-world 2026 dataset:
const KAZUMI_LEDGER: LedgerRow[] = [
  {
    id: "l-carry",
    entry_type: "carry_over_in",
    entry_date: "2026-01-01",
    hours: 182.05,
    amount: null,
    source_table: "holiday_balances",
    source_id: "snap",
    notes: null,
    created_at: "2026-01-01",
    created_by: null,
  },
  {
    id: "l-orphan",
    entry_type: "holiday_taken",
    entry_date: "2026-01-15",
    hours: -187,
    amount: null,
    source_table: "holiday_balances",
    source_id: "snap",
    notes: "Backfill reconciliation",
    created_at: "2026-01-15",
    created_by: null,
  },
  {
    id: "l-acc-feb",
    entry_type: "accrual",
    entry_date: "2026-01-26",
    hours: 3.45,
    amount: null,
    source_table: "payroll_entries",
    source_id: "pe-feb",
    notes: null,
    created_at: "2026-01-26",
    created_by: null,
  },
];

const KAZUMI_ENTRIES: PayrollEntryLite[] = [
  { id: "pe-feb", payroll_period_id: "p1", period_start_date: "2026-01-26", period_status: "approved", holiday_accrued_hours: 3.45, timesheet_hours: 28.58 },
  { id: "pe-mar", payroll_period_id: "p2", period_start_date: "2026-02-23", period_status: "approved", holiday_accrued_hours: 0, timesheet_hours: 0 },
  { id: "pe-apr", payroll_period_id: "p3", period_start_date: "2026-03-23", period_status: "approved", holiday_accrued_hours: 6.00, timesheet_hours: 49.67 },
  { id: "pe-may", payroll_period_id: "p4", period_start_date: "2026-04-20", period_status: "pending", holiday_accrued_hours: 20.04, timesheet_hours: 166 },
  { id: "pe-jun", payroll_period_id: "p5", period_start_date: "2026-05-25", period_status: "draft", holiday_accrued_hours: 4.67, timesheet_hours: 38.73 },
];

const KAZUMI_PAYMENTS: PaymentRow[] = [
  { id: "pmt-2025", payroll_period_id: "p2025", hours: 40, total: 400, holiday_taken_date: "2025-01-01", leave_year_start: "2025-01-01", notes: null, created_at: "2025-01-01" },
];

const KAZUMI_SNAPSHOT: BalanceSnapshotRow = {
  leave_year_start: "2026-01-01",
  hours_accrued: 3.45,
  hours_taken: 187,
  hours_carried_over: 182.05,
};

describe("holiday-entitlement-basis", () => {
  describe("computeBasis", () => {
    it("current_period uses only the selected period", () => {
      const r = computeBasis({
        basis: "current_period",
        leaveYear: 2026,
        selectedPeriodId: "p4",
        ledger: KAZUMI_LEDGER,
        payments: KAZUMI_PAYMENTS,
        payrollEntries: KAZUMI_ENTRIES,
      });
      expect(r.accrued).toBeCloseTo(20.04);
      expect(r.workedHours).toBeCloseTo(166);
      expect(r.carryOver).toBe(0);
      expect(r.balance).toBeCloseTo(20.04);
    });

    it("current_year matches the ledger-based canonical hook", () => {
      const r = computeBasis({
        basis: "current_year",
        leaveYear: 2026,
        ledger: KAZUMI_LEDGER,
        payments: KAZUMI_PAYMENTS,
        payrollEntries: KAZUMI_ENTRIES,
      });
      expect(r.accrued).toBeCloseTo(3.45);
      expect(r.carryOver).toBeCloseTo(182.05);
      expect(r.taken).toBeCloseTo(187);
      expect(r.balance).toBeCloseTo(-1.5);
    });

    it("full_employment sums every ledger row regardless of year", () => {
      const r = computeBasis({
        basis: "full_employment",
        leaveYear: 2026,
        ledger: KAZUMI_LEDGER,
        payments: KAZUMI_PAYMENTS,
        payrollEntries: KAZUMI_ENTRIES,
      });
      // Same numbers because all sample rows are in 2026
      expect(r.balance).toBeCloseTo(-1.5);
      expect(r.paid).toBeCloseTo(400);
    });

    it("manual basis returns the provided hours and amount without recomputing", () => {
      const r = computeBasis({
        basis: "manual",
        leaveYear: 2026,
        ledger: KAZUMI_LEDGER,
        payments: KAZUMI_PAYMENTS,
        payrollEntries: KAZUMI_ENTRIES,
        manual: { hours: 75.71, amount: 984.23 },
      });
      expect(r.balance).toBeCloseTo(75.71);
      expect(r.balanceAmount).toBeCloseTo(984.23);
    });
  });

  describe("buildSourceComparison + detectMismatch", () => {
    it("captures all four sources and detects the Kazumi-style mismatch", () => {
      const basisResult = computeBasis({
        basis: "current_year",
        leaveYear: 2026,
        ledger: KAZUMI_LEDGER,
        payments: KAZUMI_PAYMENTS,
        payrollEntries: KAZUMI_ENTRIES,
      });
      const rows = buildSourceComparison({
        leaveYear: 2026,
        ledger: KAZUMI_LEDGER,
        payments: KAZUMI_PAYMENTS,
        payrollEntries: KAZUMI_ENTRIES,
        balanceSnapshot: KAZUMI_SNAPSHOT,
        manualRecalculation: basisResult,
      });
      expect(rows).toHaveLength(4);
      const legacy = rows.find((r) => r.source === "holiday_tab_legacy")!;
      const ledger = rows.find((r) => r.source === "holiday_ledger")!;
      // Legacy now scopes to APPROVED periods only (3.45 + 0 + 6.00 = 9.45)
      // — pending / draft periods are previews, not committed accruals.
      expect(legacy.accrued).toBeCloseTo(9.45);
      expect(legacy.taken).toBe(0); // no 2026 payments
      expect(legacy.balance).toBeCloseTo(191.5);
      expect(ledger.balance).toBeCloseTo(-1.5);


      const m = detectMismatch(rows);
      expect(m.hasMismatch).toBe(true);
      expect(m.pairs.length).toBeGreaterThan(0);
    });

    it("does not flag mismatch when sources agree within tolerance", () => {
      const cleanLedger: LedgerRow[] = [
        { id: "1", entry_type: "accrual", entry_date: "2026-06-01", hours: 10, amount: null, source_table: "payroll_entries", source_id: "e1", notes: null, created_at: "x", created_by: null },
      ];
      const cleanEntries: PayrollEntryLite[] = [
        { id: "e1", payroll_period_id: "px", period_start_date: "2026-06-01", period_status: "approved", holiday_accrued_hours: 10, timesheet_hours: 80 },
      ];
      const snap: BalanceSnapshotRow = { leave_year_start: "2026-01-01", hours_accrued: 10, hours_taken: 0, hours_carried_over: 0 };
      const basisResult = computeBasis({
        basis: "current_year",
        leaveYear: 2026,
        ledger: cleanLedger,
        payments: [],
        payrollEntries: cleanEntries,
      });
      const rows = buildSourceComparison({
        leaveYear: 2026,
        ledger: cleanLedger,
        payments: [],
        payrollEntries: cleanEntries,
        balanceSnapshot: snap,
        manualRecalculation: basisResult,
      });
      expect(detectMismatch(rows).hasMismatch).toBe(false);
    });
  });

  describe("findMissingAccrualEntries", () => {
    it("flags Kazumi's missing APPROVED 2026 accrual entries only", () => {
      const gaps = findMissingAccrualEntries({
        leaveYear: 2026,
        ledger: KAZUMI_LEDGER,
        payrollEntries: KAZUMI_ENTRIES,
      });
      // pe-feb is in ledger; pe-mar has 0h → skipped; pe-may pending & pe-jun
      // draft are not yet committed; only pe-apr (approved, missing) is a gap.
      const ids = gaps.map((g) => g.payrollEntryId).sort();
      expect(ids).toEqual(["pe-apr"]);
      const totalH = gaps.reduce((s, g) => s + g.expectedAccrual, 0);
      expect(totalH).toBeCloseTo(6.0);
    });


    it("returns empty when ledger is fully aligned", () => {
      const ledger: LedgerRow[] = KAZUMI_ENTRIES.filter((e) => e.holiday_accrued_hours > 0).map(
        (e, i) => ({
          id: `l${i}`,
          entry_type: "accrual" as const,
          entry_date: e.period_start_date,
          hours: e.holiday_accrued_hours,
          amount: null,
          source_table: "payroll_entries",
          source_id: e.id,
          notes: null,
          created_at: "x",
          created_by: null,
        })
      );
      const gaps = findMissingAccrualEntries({
        leaveYear: 2026,
        ledger,
        payrollEntries: KAZUMI_ENTRIES,
      });
      expect(gaps).toEqual([]);
    });
  });
});
