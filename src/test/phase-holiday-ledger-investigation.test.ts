/**
 * Tests for the read-only Holiday Ledger Investigation view.
 *
 * Pure-logic only: validates summarisation, integrity issue detection, and
 * confirms the investigation module exposes no mutation helpers. The dialog
 * component itself never calls a mutation (no delete / update / insert /
 * RPC) — that is enforced by source inspection below.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  summariseLedger,
  findIntegrityIssues,
  hasApprovedPeriodImpact,
  type LedgerRow,
  type PaymentRow,
  type PeriodInfo,
} from "@/lib/holiday-ledger-integrity";

const baseLedger: LedgerRow[] = [
  {
    id: "l-acc",
    entry_type: "accrual",
    entry_date: "2026-01-15",
    hours: 21.1,
    amount: null,
    source_table: null,
    source_id: null,
    notes: null,
    created_at: "2026-01-15T00:00:00Z",
    created_by: null,
  },
  {
    id: "l-co",
    entry_type: "carry_over_in",
    entry_date: "2026-01-01",
    hours: 94.61,
    amount: null,
    source_table: null,
    source_id: null,
    notes: "Carry from 2025",
    created_at: "2026-01-01T00:00:00Z",
    created_by: null,
  },
  {
    id: "l-t1",
    entry_type: "holiday_taken",
    entry_date: "2026-03-10",
    hours: -41.71,
    amount: -509.27,
    source_table: "holiday_payments",
    source_id: "pay-1",
    notes: "March booking",
    created_at: "2026-03-10T00:00:00Z",
    created_by: "u1",
  },
];

const matchingPayment: PaymentRow = {
  id: "pay-1",
  payroll_period_id: "per-1",
  hours: 41.71,
  total: 509.27,
  holiday_taken_date: "2026-03-10",
  leave_year_start: "2026-01-01",
  notes: "March booking",
  created_at: "2026-03-10T00:00:00Z",
};

const draftPeriod: PeriodInfo = { id: "per-1", status: "draft", period_name: "Mar 2026" };
const approvedPeriod: PeriodInfo = {
  id: "per-1",
  status: "approved",
  period_name: "Mar 2026",
};

describe("Holiday ledger investigation — summary", () => {
  it("lists carry-over, accrued, taken and available correctly", () => {
    const s = summariseLedger(baseLedger, [matchingPayment]);
    expect(s.accruedHours).toBeCloseTo(21.1, 2);
    expect(s.carryOverHours).toBeCloseTo(94.61, 2);
    expect(s.takenHours).toBeCloseTo(41.71, 2);
    expect(s.availableHours).toBeCloseTo(74.0, 2);
    expect(s.paidAmount).toBeCloseTo(509.27, 2);
    expect(s.entries).toBe(3);
  });

  it("counts leaver settlement entries separately", () => {
    const ledger: LedgerRow[] = [
      ...baseLedger,
      {
        id: "l-set",
        entry_type: "payout_on_termination",
        entry_date: "2026-06-30",
        hours: -74,
        amount: -903,
        source_table: "holiday_payments",
        source_id: "pay-settle",
        notes: "Final settlement",
        created_at: "2026-06-30T00:00:00Z",
        created_by: "u1",
      },
    ];
    const s = summariseLedger(ledger, []);
    expect(s.leaverSettlementCount).toBe(1);
    expect(s.takenHours).toBeCloseTo(41.71 + 74, 2);
  });
});

describe("Holiday ledger investigation — integrity issues", () => {
  it("returns no issues for perfectly aligned ledger and payments", () => {
    const issues = findIntegrityIssues({
      ledger: baseLedger,
      payments: [matchingPayment],
      periodsById: { "per-1": draftPeriod },
    });
    expect(issues).toEqual([]);
  });

  it("flags an orphan ledger entry (deleted-payment style bug, Viktoriia case)", () => {
    const issues = findIntegrityIssues({
      ledger: baseLedger, // ledger still references pay-1
      payments: [], // payment was deleted
      periodsById: {},
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("ledger_without_payment");
    expect(issues[0].severity).toBe("error");
    expect(issues[0].ledgerId).toBe("l-t1");
  });

  it("flags a payment without any matching ledger entry", () => {
    const ledger = baseLedger.filter((e) => e.id !== "l-t1");
    const issues = findIntegrityIssues({
      ledger,
      payments: [matchingPayment],
      periodsById: { "per-1": draftPeriod },
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("payment_without_ledger");
    expect(issues[0].paymentId).toBe("pay-1");
    expect(issues[0].guidance).toMatch(/draft/i);
  });

  it("flags hours mismatch between ledger and payment", () => {
    const ledger: LedgerRow[] = [
      { ...baseLedger[2], hours: -40 }, // ledger says 40, payment says 41.71
    ];
    const issues = findIntegrityIssues({
      ledger,
      payments: [matchingPayment],
      periodsById: { "per-1": draftPeriod },
    });
    expect(issues.some((i) => i.code === "hours_mismatch")).toBe(true);
  });

  it("flags amount mismatch between ledger and payment", () => {
    const ledger: LedgerRow[] = [
      { ...baseLedger[2], amount: -100 }, // mismatched amount
    ];
    const issues = findIntegrityIssues({
      ledger,
      payments: [matchingPayment],
      periodsById: { "per-1": draftPeriod },
    });
    expect(issues.some((i) => i.code === "amount_mismatch")).toBe(true);
  });

  it("uses approved/locked guidance when the affected period is approved", () => {
    const ledger = baseLedger.filter((e) => e.id !== "l-t1");
    const issues = findIntegrityIssues({
      ledger,
      payments: [matchingPayment],
      periodsById: { "per-1": approvedPeriod },
    });
    expect(issues[0].guidance).toMatch(/approved or locked/i);
    expect(hasApprovedPeriodImpact(issues)).toBe(true);
  });

  it("hasApprovedPeriodImpact is false when only draft periods are affected", () => {
    const issues = findIntegrityIssues({
      ledger: baseLedger.filter((e) => e.id !== "l-t1"),
      payments: [matchingPayment],
      periodsById: { "per-1": draftPeriod },
    });
    expect(hasApprovedPeriodImpact(issues)).toBe(false);
  });
});

describe("Holiday ledger investigation — read-only contract", () => {
  it("the integrity lib exports NO mutation helpers", async () => {
    const mod = await import("@/lib/holiday-ledger-integrity");
    const banned = ["delete", "update", "insert", "save", "mutate", "recalc"];
    for (const name of Object.keys(mod)) {
      for (const b of banned) {
        expect(name.toLowerCase()).not.toContain(b);
      }
    }
  });

  it("the InvestigateLedgerDialog source contains no .delete/.update/.insert/.upsert/.rpc supabase calls", () => {
    const src = readFileSync(
      "src/components/holidays/InvestigateLedgerDialog.tsx",
      "utf8"
    );
    // Scrub the read-only `.select(...)` calls then check for any write verbs
    const writeVerbs = /\.(delete|update|insert|upsert|rpc)\s*\(/;
    expect(writeVerbs.test(src)).toBe(false);
    // And it must not call recalcPayrollPeriodTotals or any mutation hook
    expect(src).not.toMatch(/recalcPayrollPeriodTotals/);
    expect(src).not.toMatch(/useDeleteHolidayPayment/);
    expect(src).not.toMatch(/useUpdateHolidayPayment/);
    expect(src).not.toMatch(/useCreateHolidayPayment/);
  });

  it("the InvestigateLedgerDialog source does not touch payroll/NMW/service-charge/employee logic", () => {
    const src = readFileSync(
      "src/components/holidays/InvestigateLedgerDialog.tsx",
      "utf8"
    );
    expect(src).not.toMatch(/nmw|minimum_wage|service_charge|payroll-nmw/i);
    // No employee profile writes
    expect(src).not.toMatch(/from\(["']employees["']\).*\.(update|delete|insert|upsert)/);
  });
});
