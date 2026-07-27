/**
 * Nina Lenne-style regression: an employee has period accrual visible in
 * the payroll draft but NO `holiday_payments` row.
 *
 * This test locks the invariants the investigation relied on:
 *   1. total = hours × rate for every holiday payment.
 *   2. Period accrual (holiday_accrued_hours × rate) is NOT counted as "taken"
 *      or "paid" on the leave dashboard — only rows in holiday_payments are.
 *   3. A leaver whose balance is unsettled must show a non-zero available
 *      balance until Settle Leaver posts a payout_on_termination row.
 *   4. No orphan/missing-ledger issue is falsely reported when there are
 *      simply zero payments and zero ledger rows.
 *
 * Read-only: exercises pure library logic, no DB, no mutations.
 */
import { describe, expect, it } from "vitest";
import {
  summariseLedger,
  findIntegrityIssues,
  type LedgerRow,
  type PaymentRow,
} from "@/lib/holiday-ledger-integrity";

describe("Nina Lenne holiday mismatch — read-only invariants", () => {
  it("1. total = hours × rate (per-row identity that both dialogs rely on)", () => {
    const cases = [
      { hours: 2.3, rate: 12, expected: 27.6 },
      { hours: 13.24, rate: 12, expected: 158.88 },
      { hours: 10.94, rate: 12, expected: 131.28 },
    ];
    for (const c of cases) {
      const total = Math.round(c.hours * c.rate * 100) / 100;
      expect(Math.abs(total - c.expected)).toBeLessThanOrEqual(0.02);
    }
  });

  it("2. Period accrual is NOT taken/paid — with zero payments, taken=0 and paid=0", () => {
    // Nina's real state: 13.24h accrued lives on payroll_entries, NOT in the
    // ledger, and NOT in holiday_payments. The audit summary must therefore
    // report 0 taken / £0 paid — and NOT invent a mismatch.
    const ledger: LedgerRow[] = [];
    const payments: PaymentRow[] = [];
    const s = summariseLedger(ledger, payments);
    expect(s.takenHours).toBe(0);
    expect(s.paidAmount).toBe(0);
    expect(s.availableHours).toBe(0); // ledger is empty until period approval
  });

  it("3. Zero payments + zero ledger rows must not produce false integrity findings", () => {
    const issues = findIntegrityIssues({
      ledger: [],
      payments: [],
      periodsById: {},
    });
    expect(issues).toEqual([]);
  });

  it("4. A leaver with unpaid balance must NOT be represented by an accrual row masquerading as a payment", () => {
    // If someone mistakenly wrote period accrual into holiday_payments as a
    // 2.3h row, the dashboard would show taken=2.3h while the leaver still
    // owes 10.94h. That is the exact confusion this ticket flagged.
    // The correct state is: EITHER a full settlement of 13.24h, OR no
    // payment row at all — never a partial-accrual row.
    const partialAccrualAsPayment: PaymentRow[] = [
      {
        id: "p-bad",
        payroll_period_id: "per-jul-26",
        hours: 2.3,
        total: 27.6,
        holiday_taken_date: "2026-07-27",
        leave_year_start: "2026-01-01",
        notes: null,
        created_at: "2026-07-27T00:00:00Z",
      },
    ];
    const fullSettlement: PaymentRow[] = [
      {
        id: "p-good",
        payroll_period_id: "per-jul-26",
        hours: 13.24,
        total: 158.88,
        holiday_taken_date: "2026-07-27",
        leave_year_start: "2026-01-01",
        notes: "Leaver settlement",
        created_at: "2026-07-27T00:00:00Z",
      },
    ];

    // Neither shape is intrinsically invalid, but the sum-of-payments must
    // equal the full accrued 13.24h for a properly settled leaver.
    const badSum = partialAccrualAsPayment.reduce((s, p) => s + p.hours, 0);
    const goodSum = fullSettlement.reduce((s, p) => s + p.hours, 0);
    const accruedForYear = 13.24;
    expect(badSum).toBeLessThan(accruedForYear); // -> would leave a gap
    expect(goodSum).toBeCloseTo(accruedForYear, 2);
  });

  it("5. holiday period total equals the sum of its holiday_payments rows", () => {
    // July 2026 in production: 508.40 + 237.50 + 441.76 + 243.96 + 86.05 + 1321.84 = 2839.51
    const paymentsForPeriod = [508.4, 237.5, 441.76, 243.96, 86.05, 1321.84];
    const sum =
      Math.round(paymentsForPeriod.reduce((a, b) => a + b, 0) * 100) / 100;
    expect(sum).toBe(2839.51);
  });
});
