/**
 * Regression tests for the controlled "Reverse orphan holiday ledger entry"
 * correction flow (Viktoriia case: deleted holiday payment left an orphan
 * ledger row reducing her balance).
 *
 * - Logic tested via the pure `planOrphanReversal` planner.
 * - The mutation hook `useReverseOrphanLedgerEntry` is asserted via source
 *   inspection to enforce its safety contract (admin permission, orphan
 *   verification, approved-period protection, audit-preserving reversal
 *   entry instead of hard-deleting the original row, and cache
 *   invalidation for ledger / payments / period queries).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  planOrphanReversal,
  summariseLedger,
  findIntegrityIssues,
  type LedgerRow,
  type PaymentRow,
} from "@/lib/holiday-ledger-integrity";

// Viktoriia 2026 fixture
const viktoriiaLedger: LedgerRow[] = [
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
    id: "l-acc",
    entry_type: "accrual",
    entry_date: "2026-03-31",
    hours: 21.1,
    amount: null,
    source_table: null,
    source_id: null,
    notes: null,
    created_at: "2026-03-31T00:00:00Z",
    created_by: null,
  },
  {
    id: "l-apr",
    entry_type: "holiday_taken",
    entry_date: "2026-04-15",
    hours: -40,
    amount: -520,
    source_table: "holiday_payments",
    source_id: "pay-apr",
    notes: "April approved holiday",
    created_at: "2026-04-15T00:00:00Z",
    created_by: "u1",
  },
  {
    id: "l-orphan",
    entry_type: "holiday_taken",
    entry_date: "2026-05-25",
    hours: -75.71,
    amount: -984.23,
    source_table: "holiday_payments",
    source_id: "pay-deleted",
    notes: "Orphan from deleted May payment",
    created_at: "2026-05-25T00:00:00Z",
    created_by: "u1",
  },
];

const aprilPayment: PaymentRow = {
  id: "pay-apr",
  payroll_period_id: "per-apr",
  hours: 40,
  total: 520,
  holiday_taken_date: "2026-04-15",
  leave_year_start: "2026-01-01",
  notes: "April",
  created_at: "2026-04-15T00:00:00Z",
};

const orphanRow = viktoriiaLedger.find((l) => l.id === "l-orphan")!;
const aprilRow = viktoriiaLedger.find((l) => l.id === "l-apr")!;

describe("Orphan ledger detection (Viktoriia case)", () => {
  it("detects the orphan row when the source holiday payment no longer exists", () => {
    const issues = findIntegrityIssues({
      ledger: viktoriiaLedger,
      payments: [aprilPayment], // May payment deleted
      periodsById: {},
    });
    const orphan = issues.find((i) => i.code === "ledger_without_payment");
    expect(orphan).toBeDefined();
    expect(orphan!.ledgerId).toBe("l-orphan");
    expect(orphan!.severity).toBe("error");
  });

  it("pre-correction available balance is 0.00 h (Viktoriia symptom)", () => {
    const s = summariseLedger(viktoriiaLedger, [aprilPayment]);
    // 94.61 + 21.10 - 40 - 75.71 = 0.00
    expect(s.availableHours).toBeCloseTo(0, 2);
  });
});

describe("planOrphanReversal — controlled correction", () => {
  it("allows reversal of a true orphan row and restores 75.71 h", () => {
    const plan = planOrphanReversal({
      ledgerRow: orphanRow,
      currentPayments: [aprilPayment],
      currentAvailable: 0,
      reason: "Leaver settlement preparation",
    });
    expect(plan.allowed).toBe(true);
    expect(plan.hoursToReverse).toBeCloseTo(75.71, 2);
    expect(plan.amountToReverse).toBeCloseTo(984.23, 2);
    expect(plan.projectedAvailable).toBeCloseTo(75.71, 2);
    expect(plan.reversingEntry).not.toBeNull();
    expect(plan.reversingEntry!.entry_type).toBe("correction");
    expect(plan.reversingEntry!.source_table).toBe("holiday_ledger");
    expect(plan.reversingEntry!.source_id).toBe("l-orphan");
    expect(plan.reversingEntry!.notes).toMatch(
      /Reversal of orphan holiday ledger entry/i
    );
    expect(plan.reversingEntry!.notes).toMatch(/Leaver settlement preparation/);
  });

  it("refuses to reverse when the linked payment still exists (not orphan)", () => {
    const plan = planOrphanReversal({
      ledgerRow: aprilRow,
      currentPayments: [aprilPayment],
      currentAvailable: 0,
    });
    expect(plan.allowed).toBe(false);
    expect(plan.reason).toMatch(/not orphan/i);
    expect(plan.reversingEntry).toBeNull();
    expect(plan.projectedAvailable).toBe(0);
  });

  it("refuses if the row was sourced from a payment in an approved period", () => {
    const plan = planOrphanReversal({
      ledgerRow: orphanRow,
      currentPayments: [aprilPayment],
      currentAvailable: 0,
      sourcePeriodStatus: "approved",
    });
    expect(plan.allowed).toBe(false);
    expect(plan.reason).toMatch(/approved or locked/i);
  });

  it("refuses if the row was sourced from a payment in a locked period", () => {
    const plan = planOrphanReversal({
      ledgerRow: orphanRow,
      currentPayments: [aprilPayment],
      currentAvailable: 0,
      sourcePeriodStatus: "locked",
    });
    expect(plan.allowed).toBe(false);
    expect(plan.reason).toMatch(/approved or locked/i);
  });

  it("refuses to reverse a non-holiday_taken ledger row", () => {
    const accrual = viktoriiaLedger.find((l) => l.id === "l-acc")!;
    const plan = planOrphanReversal({
      ledgerRow: accrual,
      currentPayments: [aprilPayment],
      currentAvailable: 0,
    });
    expect(plan.allowed).toBe(false);
    expect(plan.reversingEntry).toBeNull();
  });

  it("refuses to reverse a ledger row not sourced from holiday_payments", () => {
    const odd: LedgerRow = {
      ...orphanRow,
      source_table: "something_else",
    };
    const plan = planOrphanReversal({
      ledgerRow: odd,
      currentPayments: [],
      currentAvailable: 0,
    });
    expect(plan.allowed).toBe(false);
  });

  it("reversal does not touch the valid April approved holiday row", () => {
    const plan = planOrphanReversal({
      ledgerRow: orphanRow,
      currentPayments: [aprilPayment],
      currentAvailable: 0,
    });
    // Simulate post-correction ledger by appending the reversing entry
    const post: LedgerRow[] = [
      ...viktoriiaLedger,
      {
        id: "l-reverse",
        entry_type: "correction",
        entry_date: "2026-05-26",
        hours: plan.reversingEntry!.hours,
        amount: plan.reversingEntry!.amount,
        source_table: "holiday_ledger",
        source_id: "l-orphan",
        notes: plan.reversingEntry!.notes,
        created_at: "2026-05-26T00:00:00Z",
        created_by: "admin",
      },
    ];
    // Original orphan row is preserved (audit trail) AND April row untouched
    expect(post.find((r) => r.id === "l-orphan")).toBeDefined();
    const april = post.find((r) => r.id === "l-apr")!;
    expect(april.hours).toBe(-40);
    expect(april.amount).toBe(-520);

    const summary = summariseLedger(post, [aprilPayment]);
    // 94.61 + 21.10 - 40 - 75.71 + 75.71 = 75.71
    expect(summary.availableHours).toBeCloseTo(75.71, 2);
  });
});

describe("useReverseOrphanLedgerEntry — safety contract (source inspection)", () => {
  const src = readFileSync("src/hooks/useHolidays.ts", "utf8");

  it("requires an admin-level permission before executing", () => {
    const hookSlice = src.split("useReverseOrphanLedgerEntry")[1] ?? "";
    expect(hookSlice).toMatch(/assertPermission\(\s*["']approve_holidays["']/);
  });

  it("verifies the ledger row is a holiday_taken entry sourced from holiday_payments", () => {
    const hookSlice = src.split("useReverseOrphanLedgerEntry")[1] ?? "";
    expect(hookSlice).toMatch(/entry_type\s*!==\s*["']holiday_taken["']/);
    expect(hookSlice).toMatch(/source_table\s*!==\s*["']holiday_payments["']/);
  });

  it("verifies the source holiday payment no longer exists before writing", () => {
    const hookSlice = src.split("useReverseOrphanLedgerEntry")[1] ?? "";
    expect(hookSlice).toMatch(/from\(["']holiday_payments["']\)[\s\S]*?source_id/);
    expect(hookSlice).toMatch(/not orphan/i);
  });

  it("blocks reversal if the linked payment is in an approved/locked period", () => {
    const hookSlice = src.split("useReverseOrphanLedgerEntry")[1] ?? "";
    expect(hookSlice).toMatch(/approved|locked/);
    expect(hookSlice).toMatch(/payroll_periods/);
  });

  it("writes a reversing correction entry instead of deleting the original orphan row", () => {
    const hookSlice = src.split("useReverseOrphanLedgerEntry")[1] ?? "";
    // Must INSERT into holiday_ledger
    expect(hookSlice).toMatch(/from\(["']holiday_ledger["']\)\s*\.insert/);
    // Must NOT delete from holiday_ledger inside this hook
    expect(hookSlice).not.toMatch(/from\(["']holiday_ledger["']\)\s*\.delete/);
    // Reversing entry must use entry_type 'correction'
    expect(hookSlice).toMatch(/entry_type:\s*["']correction["']/);
  });

  it("invalidates ledger, payments, year total and period queries on success", () => {
    const hookSlice = src.split("useReverseOrphanLedgerEntry")[1] ?? "";
    expect(hookSlice).toMatch(/holiday_ledger/);
    expect(hookSlice).toMatch(/holiday_payments/);
    expect(hookSlice).toMatch(/holiday_payments_year_total/);
    expect(hookSlice).toMatch(/payroll_periods/);
  });

  it("does not modify employee profile data, payroll rates, NMW or service-charge logic", () => {
    // Slice only the body of useReverseOrphanLedgerEntry: from its definition
    // to the next exported hook, so unrelated hooks below are not inspected.
    const after = src.split("export function useReverseOrphanLedgerEntry")[1] ?? "";
    const hookSlice = after.split(/\nexport function /)[0] ?? after;
    expect(hookSlice).not.toMatch(/from\(["']employees["']\)/);
    expect(hookSlice).not.toMatch(/from\(["']payroll_entries["']\)/);
    expect(hookSlice).not.toMatch(/nmw|minimum_wage/i);
    expect(hookSlice).not.toMatch(/service[_-]?charge/i);
  });

});

describe("InvestigateLedgerDialog — admin-only, confirmation-gated trigger", () => {
  const src = readFileSync(
    "src/components/holidays/InvestigateLedgerDialog.tsx",
    "utf8"
  );

  it("only shows the reversal button for ledger_without_payment issues to admins", () => {
    expect(src).toMatch(
      /iss\.code\s*===\s*["']ledger_without_payment["']\s*&&\s*isAdmin/
    );
  });

  it("renders a confirmation modal with employee, hours, amount and reason before executing", () => {
    expect(src).toMatch(/OrphanReversalConfirm/);
    expect(src).toMatch(/AlertDialog/);
    expect(src).toMatch(/Reason/);
    expect(src).toMatch(/restore/i);
    expect(src).toMatch(/balance/i);

  });

  it("uses the controlled useReverseOrphanLedgerEntry hook, not direct supabase writes", () => {
    expect(src).toMatch(/useReverseOrphanLedgerEntry/);
    expect(src).not.toMatch(/\.delete\s*\(/);
    expect(src).not.toMatch(/\.insert\s*\(/);
    expect(src).not.toMatch(/\.update\s*\(/);
  });
});
