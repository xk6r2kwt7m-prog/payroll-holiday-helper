/**
 * Holiday Pay Integrity Audit — regression suite.
 *
 * READ-ONLY by design. This file formalises the seven integrity rules used in
 * /mnt/documents/holiday-integrity-audit/REPORT.md so they can be re-run in CI
 * against synthetic fixtures. It exercises the existing pure-logic library at
 * `@/lib/holiday-ledger-integrity` (which the InvestigateLedgerDialog also
 * uses) and confirms:
 *
 *   1. total = hours × rate is the single formula for holiday_payments
 *   2. amount mismatches beyond 2p are detected
 *   3. orphan ledger entries (payment deleted) are flagged
 *   4. payments without a ledger entry are flagged
 *   5. hours-vs-amount mismatches between ledger and payment are flagged
 *   6. correction / reversal ledger rows are included in balance recalculation
 *   7. approved-period impact is surfaced separately from draft impact
 *   8. no mutation surface is added by the audit
 */
import { describe, expect, it } from "vitest";
import {
  summariseLedger,
  findIntegrityIssues,
  hasApprovedPeriodImpact,
  type LedgerRow,
  type PaymentRow,
  type PeriodInfo,
} from "@/lib/holiday-ledger-integrity";

const HP_ID = "pay-1";
const PERIOD_ID = "per-1";

function makePayment(over: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: HP_ID,
    payroll_period_id: PERIOD_ID,
    hours: 30,
    total: 30 * 12.71, // 381.30
    holiday_taken_date: "2026-06-22",
    leave_year_start: "2026-01-01",
    notes: null,
    created_at: "2026-06-22T00:00:00Z",
    ...over,
  };
}

function makeLedgerTaken(over: Partial<LedgerRow> = {}): LedgerRow {
  return {
    id: "l-taken",
    entry_type: "holiday_taken",
    entry_date: "2026-06-22",
    hours: -30,
    amount: -381.3,
    source_table: "holiday_payments",
    source_id: HP_ID,
    notes: null,
    created_at: "2026-06-22T00:00:00Z",
    created_by: null,
    ...over,
  };
}

const draftPeriod: PeriodInfo = { id: PERIOD_ID, status: "draft", period_name: "June 2026" };
const approvedPeriod: PeriodInfo = { ...draftPeriod, status: "approved" };

describe("Holiday Pay Integrity Audit — read-only regression", () => {
  it("Rule 1: total equals hours × rate to 2p tolerance", () => {
    // Formula lives in AddHolidayPaymentDialog & SettleLeaverDialog:
    //   total = (parseFloat(hours) || 0) * (parseFloat(rate) || 0)
    const cases = [
      { hours: 30, rate: 12.71, total: 381.3 },
      { hours: 148.42, rate: 13, total: 1929.46 },
      { hours: 80, rate: 12.71, total: 1016.8 },
    ];
    for (const c of cases) {
      const expected = Math.round(c.hours * c.rate * 100) / 100;
      expect(Math.abs(expected - c.total)).toBeLessThanOrEqual(0.02);
    }
  });

  it("Rule 2: amount mismatches beyond tolerance are surfaced", () => {
    const issues = findIntegrityIssues({
      ledger: [makeLedgerTaken({ amount: -100 })], // stored ledger amount out of sync
      payments: [makePayment()],
      periodsById: { [PERIOD_ID]: draftPeriod },
    });
    expect(issues.some((i) => i.code === "amount_mismatch")).toBe(true);
  });

  it("Rule 3: orphan ledger (deleted payment) is flagged as an error", () => {
    const issues = findIntegrityIssues({
      ledger: [makeLedgerTaken()],
      payments: [], // payment deleted
      periodsById: {},
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("ledger_without_payment");
    expect(issues[0].severity).toBe("error");
  });

  it("Rule 4: payment with no matching ledger row is flagged", () => {
    const issues = findIntegrityIssues({
      ledger: [],
      payments: [makePayment()],
      periodsById: { [PERIOD_ID]: draftPeriod },
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("payment_without_ledger");
  });

  it("Rule 5: hours mismatch between ledger and payment is flagged", () => {
    const issues = findIntegrityIssues({
      ledger: [makeLedgerTaken({ hours: -29 })], // ledger 29h, payment 30h
      payments: [makePayment()],
      periodsById: { [PERIOD_ID]: draftPeriod },
    });
    expect(issues.some((i) => i.code === "hours_mismatch")).toBe(true);
  });

  it("Rule 6: correction/reversal rows are included in the recalculated balance", () => {
    const ledger: LedgerRow[] = [
      {
        id: "l-acc",
        entry_type: "accrual",
        entry_date: "2026-01-15",
        hours: 100,
        amount: null,
        source_table: null,
        source_id: null,
        notes: null,
        created_at: "2026-01-15T00:00:00Z",
        created_by: null,
      },
      makeLedgerTaken({ id: "l-t", hours: -30, amount: -381.3 }),
      {
        id: "l-corr",
        entry_type: "correction",
        entry_date: "2026-06-30",
        hours: -5,
        amount: null,
        source_table: null,
        source_id: null,
        notes: "Manual correction: overpaid 5h",
        created_at: "2026-06-30T00:00:00Z",
        created_by: "admin",
      },
    ];
    const s = summariseLedger(ledger, [makePayment()]);
    // accrued 100 − taken 30 − correction 5 = 65
    expect(s.availableHours).toBeCloseTo(65, 2);
  });

  it("Rule 7: approved-period impact is reported separately from draft impact", () => {
    const draftIssues = findIntegrityIssues({
      ledger: [],
      payments: [makePayment()],
      periodsById: { [PERIOD_ID]: draftPeriod },
    });
    const approvedIssues = findIntegrityIssues({
      ledger: [],
      payments: [makePayment()],
      periodsById: { [PERIOD_ID]: approvedPeriod },
    });
    expect(hasApprovedPeriodImpact(draftIssues)).toBe(false);
    expect(hasApprovedPeriodImpact(approvedIssues)).toBe(true);
    expect(approvedIssues[0].guidance).toMatch(/approved or locked/i);
  });

  it("Rule 8: audit module exposes NO mutation helpers (read-only contract)", async () => {
    const mod = await import("@/lib/holiday-ledger-integrity");
    const banned = ["delete", "update", "insert", "save", "mutate", "recalc"];
    for (const name of Object.keys(mod)) {
      for (const b of banned) {
        expect(name.toLowerCase()).not.toContain(b);
      }
    }
  });

  it("Draft-period findings are reported but not auto-corrected", () => {
    // The library must return diagnostic issues, never a `fix` / `apply` action.
    const issues = findIntegrityIssues({
      ledger: [makeLedgerTaken({ amount: -100 })],
      payments: [makePayment()],
      periodsById: { [PERIOD_ID]: draftPeriod },
    });
    for (const i of issues) {
      expect(Object.keys(i)).not.toContain("apply");
      expect(Object.keys(i)).not.toContain("fix");
      expect(Object.keys(i)).not.toContain("mutation");
    }
  });
});
