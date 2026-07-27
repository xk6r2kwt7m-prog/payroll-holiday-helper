import { describe, it, expect } from "vitest";
import {
  computeBasis,
  buildSourceComparison,
  detectMismatch,
  type PayrollEntryLite,
} from "@/lib/holiday-entitlement-basis";
import type { LedgerRow, PaymentRow } from "@/lib/holiday-ledger-integrity";

// Nina Lenne scenario: draft July 2026 accrual (2.30h) + June 2026 approved
// accrual (10.94h). Ledger only holds APPROVED period accrual — draft is
// pending posting. Leave dashboard shows total 13.24h.

const NINA_ENTRIES: PayrollEntryLite[] = [
  {
    id: "e1",
    payroll_period_id: "p-june",
    period_start_date: "2026-06-01",
    period_status: "approved",
    holiday_accrued_hours: 10.94,
    timesheet_hours: 91.17,
  },
  {
    id: "e2",
    payroll_period_id: "p-july",
    period_start_date: "2026-07-01",
    period_status: "draft",
    holiday_accrued_hours: 2.3,
    timesheet_hours: 19.17,
  },
];

const NINA_LEDGER: LedgerRow[] = [
  {
    id: "l1",
    entry_date: "2026-06-30",
    entry_type: "accrual",
    hours: 10.94,
    source_table: "payroll_entries",
    source_id: "e1",
  } as any,
];

const NINA_PAYMENTS: PaymentRow[] = [];

describe("leaver settlement — live payroll accrual", () => {
  it("live_accrual basis returns the leave-dashboard balance (13.24h) including draft accrual", () => {
    const r = computeBasis({
      basis: "live_accrual",
      leaveYear: 2026,
      ledger: NINA_LEDGER,
      payments: NINA_PAYMENTS,
      payrollEntries: NINA_ENTRIES,
    });
    expect(r.accrued).toBeCloseTo(13.24, 2);
    expect(r.balance).toBeCloseTo(13.24, 2);
    // × £12/hr → £158.88 handled by dialog (rate × hours)
    expect(r.balance * 12).toBeCloseTo(158.88, 2);
  });

  it("adds a Live payroll accrual source row alongside the ledger row", () => {
    const basisResult = computeBasis({
      basis: "live_accrual",
      leaveYear: 2026,
      ledger: NINA_LEDGER,
      payments: NINA_PAYMENTS,
      payrollEntries: NINA_ENTRIES,
    });
    const rows = buildSourceComparison({
      leaveYear: 2026,
      ledger: NINA_LEDGER,
      payments: NINA_PAYMENTS,
      payrollEntries: NINA_ENTRIES,
      balanceSnapshot: null,
      manualRecalculation: basisResult,
    });
    const live = rows.find((r) => r.source === "live_payroll_accrual")!;
    const ledger = rows.find((r) => r.source === "holiday_ledger")!;
    expect(live.accrued).toBeCloseTo(13.24, 2);
    expect(live.balance).toBeCloseTo(13.24, 2);
    expect(ledger.accrued).toBeCloseTo(10.94, 2);
    // The live row exposes an info note about the pending draft accrual
    expect(live.info).toMatch(/draft/i);
  });

  it("classifies live-vs-ledger differences as timing, not a blocking mismatch", () => {
    const basisResult = computeBasis({
      basis: "live_accrual",
      leaveYear: 2026,
      ledger: NINA_LEDGER,
      payments: NINA_PAYMENTS,
      payrollEntries: NINA_ENTRIES,
    });
    const rows = buildSourceComparison({
      leaveYear: 2026,
      ledger: NINA_LEDGER,
      payments: NINA_PAYMENTS,
      payrollEntries: NINA_ENTRIES,
      balanceSnapshot: null,
      manualRecalculation: basisResult,
    });
    const m = detectMismatch(rows);
    // Manual recalculation was live_accrual so it matches the live row —
    // remaining differences are between live_payroll_accrual and the ledger,
    // which must be classified as informational timing, not blocking.
    expect(m.hasMismatch).toBe(false);
    expect(m.timingPairs.length).toBeGreaterThan(0);
  });

  it("live_accrual note flags pending draft posting", () => {
    const r = computeBasis({
      basis: "live_accrual",
      leaveYear: 2026,
      ledger: NINA_LEDGER,
      payments: NINA_PAYMENTS,
      payrollEntries: NINA_ENTRIES,
    });
    expect(r.notes.some((n) => /draft/i.test(n))).toBe(true);
  });
});
