/**
 * Regression tests for the system-wide carry-over double-count fix in
 * `computeFullEmploymentBalance`.
 *
 * Background — 73 employees (20 active, 53 leavers) had a `holiday_ledger`
 * containing BOTH detailed prior-year accrual/taken rows AND a
 * `carry_over_in` summary row for the same prior years, produced by the
 * 2026-03 `holiday_balances` backfill. A naive sum of every row therefore
 * double-counted prior-year history.
 *
 * Behaviour locked in:
 *   1. `computeFullEmploymentBalance` returns the year-aware balance: it
 *      sums detailed rows year-by-year and ignores `carry_over_in` rows
 *      when prior-year detail rows exist for the same employee.
 *   2. It sets `carryOverDuplicationDetected = true` whenever it drops a
 *      carry_over_in for that reason — so Settle Leaver can block.
 *   3. When no detail rows exist (carry_over_in is the only history), the
 *      carry_over_in IS honoured — first-year leavers still settle.
 *   4. Rubem and Kazumi fixtures (real DB shape) resolve to their true
 *      year-aware balances, not the inflated raw sums.
 */
import { describe, it, expect } from "vitest";
import {
  computeBasis,
  computeFullEmploymentBalance,
} from "@/lib/holiday-entitlement-basis";
import type { LedgerRow } from "@/lib/holiday-ledger-integrity";

function row(
  partial: Partial<LedgerRow> & {
    entry_type: LedgerRow["entry_type"];
    entry_date: string;
    hours: number;
  },
): LedgerRow {
  return {
    id: partial.id ?? `${partial.entry_type}-${partial.entry_date}-${partial.hours}`,
    entry_type: partial.entry_type,
    entry_date: partial.entry_date,
    hours: partial.hours,
    amount: partial.amount ?? null,
    source_table: partial.source_table ?? null,
    source_id: partial.source_id ?? null,
    notes: partial.notes ?? null,
    created_at: partial.created_at ?? `${partial.entry_date}T00:00:00Z`,
    created_by: partial.created_by ?? null,
  };
}

describe("computeFullEmploymentBalance — carry-over double-count fix", () => {
  it("ignores carry_over_in when prior-year detail rows exist", () => {
    const ledger: LedgerRow[] = [
      row({ entry_type: "accrual", entry_date: "2024-12-16", hours: 16.53 }),
      row({ entry_type: "carry_over_in", entry_date: "2025-01-01", hours: 16.53 }),
      row({ entry_type: "accrual", entry_date: "2025-06-23", hours: 22.07 }),
      row({ entry_type: "holiday_taken", entry_date: "2025-06-22", hours: -40 }),
    ];
    const fe = computeFullEmploymentBalance(ledger);
    // True: 16.53 (2024 accrual) + 22.07 (2025 accrual) − 40 (2025 taken) = -1.40
    // Naive would add carry_over_in 16.53 → +15.13 (wrong).
    expect(fe.balance).toBeCloseTo(-1.4, 2);
    expect(fe.carryOverDuplicationDetected).toBe(true);
    expect(fe.carryOver).toBe(0);
  });

  it("honours carry_over_in when no prior-year detail exists (first-year leaver)", () => {
    const ledger: LedgerRow[] = [
      row({ entry_type: "carry_over_in", entry_date: "2026-01-01", hours: 50 }),
      row({ entry_type: "accrual", entry_date: "2026-03-31", hours: 10 }),
      row({ entry_type: "holiday_taken", entry_date: "2026-04-15", hours: -20 }),
    ];
    const fe = computeFullEmploymentBalance(ledger);
    expect(fe.balance).toBeCloseTo(40, 2); // 50 + 10 − 20
    expect(fe.carryOverDuplicationDetected).toBe(false);
    expect(fe.carryOver).toBe(50);
  });

  it("Rubem Pereira fixture: true balance is +8.85 h, not raw +203.30 h", () => {
    // Replicates the real DB shape gathered in the read-only investigation.
    const ledger: LedgerRow[] = [
      row({ entry_type: "accrual", entry_date: "2024-12-16", hours: 16.53 }),
      // 2025
      row({ entry_type: "carry_over_in", entry_date: "2025-01-01", hours: 16.53 }),
      row({ entry_type: "accrual", entry_date: "2025-01-20", hours: 25.31 }),
      row({ entry_type: "accrual", entry_date: "2025-02-24", hours: 22.95 }),
      row({ entry_type: "accrual", entry_date: "2025-03-25", hours: 19.24 }),
      row({ entry_type: "accrual", entry_date: "2025-04-21", hours: 25.61 }),
      row({ entry_type: "accrual", entry_date: "2025-05-26", hours: 18.35 }),
      row({ entry_type: "holiday_taken", entry_date: "2025-06-22", hours: -40 }),
      row({ entry_type: "accrual", entry_date: "2025-06-23", hours: 22.07 }),
      row({ entry_type: "accrual", entry_date: "2025-07-21", hours: 24.67 }),
      row({ entry_type: "accrual", entry_date: "2025-08-25", hours: 20.51 }),
      row({ entry_type: "accrual", entry_date: "2025-09-22", hours: 28.03 }),
      row({ entry_type: "accrual", entry_date: "2025-10-27", hours: 17.42 }),
      row({ entry_type: "accrual", entry_date: "2025-11-17", hours: 12.9 }),
      row({ entry_type: "holiday_taken", entry_date: "2025-12-14", hours: -64 }),
      row({ entry_type: "accrual", entry_date: "2025-12-15", hours: 28.33 }),
      // 2026
      row({ entry_type: "carry_over_in", entry_date: "2026-01-01", hours: 177.92 }),
      row({ entry_type: "accrual", entry_date: "2026-01-26", hours: 19.75 }),
      row({ entry_type: "accrual", entry_date: "2026-03-22", hours: 21.9 }),
      row({ entry_type: "accrual", entry_date: "2026-04-19", hours: 8.85 }),
      row({ entry_type: "holiday_taken", entry_date: "2026-04-20", hours: -80 }),
      row({ entry_type: "holiday_taken", entry_date: "2026-06-22", hours: -139.57 }),
    ];

    const naive = ledger.reduce((s, r) => {
      if (
        r.entry_type === "holiday_taken" ||
        r.entry_type === "payout_on_termination"
      ) {
        return s - Math.abs(Number(r.hours));
      }
      return s + Number(r.hours);
    }, 0);
    expect(naive).toBeCloseTo(203.3, 1); // documents the buggy raw sum

    const fe = computeFullEmploymentBalance(ledger);
    // Year-aware:
    //  2024: +16.53 accrued
    //  2025: +265.39 accrued − 104.00 taken = +161.39
    //  2026: +50.50 accrued − 219.57 taken = -169.07
    //  Carry_over_in rows ignored (prior detail exists)
    //  Total: 16.53 + 161.39 − 169.07 = +8.85
    expect(fe.balance).toBeCloseTo(8.85, 2);
    expect(fe.carryOverDuplicationDetected).toBe(true);
  });

  it("Kazumi Ortega fixture: balance reconciles with the +187 reversal correction", () => {
    const ledger: LedgerRow[] = [
      row({ entry_type: "accrual", entry_date: "2024-09-23", hours: 2.25 }),
      row({ entry_type: "accrual", entry_date: "2024-10-21", hours: 10.89 }),
      row({ entry_type: "accrual", entry_date: "2024-11-18", hours: 11.38 }),
      row({ entry_type: "accrual", entry_date: "2024-12-16", hours: 15.57 }),
      // 2025
      row({ entry_type: "carry_over_in", entry_date: "2025-01-01", hours: 40.09 }),
      row({ entry_type: "holiday_taken", entry_date: "2025-01-01", hours: -40 }),
      row({ entry_type: "accrual", entry_date: "2025-01-20", hours: 15.19 }),
      row({ entry_type: "accrual", entry_date: "2025-02-24", hours: 11.53 }),
      row({ entry_type: "accrual", entry_date: "2025-03-25", hours: 13.1 }),
      row({ entry_type: "accrual", entry_date: "2025-04-21", hours: 19.47 }),
      row({ entry_type: "accrual", entry_date: "2025-05-26", hours: 15.97 }),
      row({ entry_type: "accrual", entry_date: "2025-06-23", hours: 16.62 }),
      row({ entry_type: "accrual", entry_date: "2025-07-21", hours: 14.5 }),
      row({ entry_type: "accrual", entry_date: "2025-08-25", hours: 14.92 }),
      row({ entry_type: "accrual", entry_date: "2025-09-22", hours: 18.48 }),
      row({ entry_type: "accrual", entry_date: "2025-10-27", hours: 10.58 }),
      row({ entry_type: "accrual", entry_date: "2025-11-17", hours: 17.39 }),
      row({ entry_type: "accrual", entry_date: "2025-12-15", hours: 14.21 }),
      // 2026
      row({ entry_type: "carry_over_in", entry_date: "2026-01-01", hours: 182.05 }),
      row({ entry_type: "holiday_taken", entry_date: "2026-01-15", hours: -187 }),
      row({ entry_type: "accrual", entry_date: "2026-01-26", hours: 3.45 }),
      row({ entry_type: "accrual", entry_date: "2026-04-19", hours: 6.0 }),
      row({ entry_type: "correction", entry_date: "2026-06-22", hours: 187 }),
    ];
    const fe = computeFullEmploymentBalance(ledger);
    // 2024 accrual = 40.09
    // 2025 accrual = 181.96, taken 40 → net 141.96
    // 2026 accrual 9.45, taken 187, correction +187 → net 9.45
    // Total = 40.09 + 141.96 + 9.45 = 191.50  (matches the audited DB net)
    expect(fe.balance).toBeCloseTo(191.5, 2);
    expect(fe.carryOverDuplicationDetected).toBe(true);
  });

  it("computeBasis full_employment surfaces the duplication flag + blocking note", () => {
    const ledger: LedgerRow[] = [
      row({ entry_type: "accrual", entry_date: "2025-06-23", hours: 10 }),
      row({ entry_type: "carry_over_in", entry_date: "2026-01-01", hours: 10 }),
      row({ entry_type: "accrual", entry_date: "2026-03-31", hours: 5 }),
    ];
    const result = computeBasis({
      basis: "full_employment",
      leaveYear: 2026,
      ledger,
      payments: [],
      payrollEntries: [],
    });
    expect(result.carryOverDuplicationDetected).toBe(true);
    expect(result.notes.some((n) => /duplication/i.test(n))).toBe(true);
    // 10 (2025) + 5 (2026) — carry_over_in ignored
    expect(result.balance).toBeCloseTo(15, 2);
  });
});
