/**
 * Guardrails G1–G4 regression tests.
 *
 *  G1 — NMW approval block honours authorised overrides.
 *  G2 — DOB sanity (mirrors DB trigger; pure JS rule).
 *  G3 — Adjustment-note requirement on zero-hour non-zero payments
 *       (mirrors DB trigger; pure JS rule).
 *  G4 — Service-charge eligibility approval block honours per-line
 *       override notes.
 *
 *  These are pure-logic tests. No DB, no payroll data is mutated.
 *  They are deliberately independent of the June 2026 live blockers
 *  so the guardrail can be merged without silently correcting them.
 */
import { describe, it, expect } from "vitest";
import {
  buildApprovalChecklist,
  canApprove,
} from "@/lib/payroll-approval-checklist";
import {
  buildPayrollPeriodReport,
  type PayrollEntryLike,
} from "@/lib/labour-reporting";
import type { TermsRow } from "@/lib/labour-costing";

const PERIOD = {
  id: "p1",
  period_name: "Test period",
  start_date: "2026-05-01",
  end_date: "2026-05-31",
  status: "draft",
};

function term(over: Partial<TermsRow> = {}): TermsRow {
  return {
    id: "t1",
    employee_id: "emp1",
    contract_id: "c1",
    tenant_id: "tenant1",
    effective_from: "2026-01-01",
    effective_to: null,
    status: "active",
    base_hourly_rate: 12.71,
    hourly_rate: 12.71,
    guaranteed_service_charge_rate: 1,
    estimated_service_charge_rate: 0.5,
    source_type: "signed_contract",
    ...over,
  } as unknown as TermsRow;
}

function entry(over: Partial<PayrollEntryLike> = {}): PayrollEntryLike {
  return {
    id: over.id ?? "e1",
    employee_id: over.employee_id ?? "emp1",
    employee_name: "Alex Example",
    date_of_birth: "1990-01-01",
    is_apprentice: false,
    timesheet_hours: 40,
    hourly_rate: 12.71,
    service_charge: 1.5,
    performance_bonus: 0,
    special_bonus: 0,
    total_pay: 40 * (12.71 + 1.5),
    ...over,
  };
}

// ---------------------------------------------------------------------------
// G1 — NMW approval block honours authorised overrides
// ---------------------------------------------------------------------------
describe("G1 — NMW approval block", () => {
  it("blocks approval when an NMW failure has no override row", () => {
    const r = buildPayrollPeriodReport(
      PERIOD,
      [entry({ hourly_rate: 9, service_charge: 0 })],
      new Map([["emp1", [term()]]]),
    );
    const cl = buildApprovalChecklist({
      period_status: "draft",
      entries: r.entries,
    });
    const item = cl.items.find((i) => i.id === "nmw_non_compliant");
    expect(item?.status).toBe("block");
    expect(canApprove(cl, new Set(cl.ack_required_ids))).toBe(false);
  });

  it("does NOT block when an authorised NMW override row exists", () => {
    const r = buildPayrollPeriodReport(
      PERIOD,
      [entry({ hourly_rate: 9, service_charge: 0 })],
      new Map([["emp1", [term()]]]),
    );
    const cl = buildApprovalChecklist({
      period_status: "draft",
      entries: r.entries,
      nmwOverrideEmployeeIds: new Set(["emp1"]),
    });
    const block = cl.items.find((i) => i.id === "nmw_non_compliant");
    const warn = cl.items.find((i) => i.id === "nmw_override_in_use");
    expect(block?.status).toBe("pass");
    expect(warn?.status).toBe("warning");
    expect(warn?.requires_ack).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// G2 — DOB sanity rule (mirrors the DB trigger validate_employee_dob)
// ---------------------------------------------------------------------------
function isDobAcceptable(iso: string): { ok: boolean; reason?: string } {
  const dob = new Date(iso);
  if (isNaN(dob.getTime())) return { ok: false, reason: "invalid" };
  const today = new Date();
  if (dob > today) return { ok: false, reason: "future" };
  const minAdult = new Date(today);
  minAdult.setFullYear(today.getFullYear() - 14);
  if (dob > minAdult) return { ok: false, reason: "under_14" };
  return { ok: true };
}

describe("G2 — DOB sanity gate", () => {
  it("rejects a future DOB", () => {
    expect(isDobAcceptable("2099-01-01").ok).toBe(false);
    expect(isDobAcceptable("2099-01-01").reason).toBe("future");
  });
  it("rejects a DOB under 14 years old (the Huda Shirwa case)", () => {
    expect(isDobAcceptable("2026-06-17").ok).toBe(false);
  });
  it("accepts a normal adult DOB", () => {
    expect(isDobAcceptable("1990-05-12").ok).toBe(true);
  });
  it("rejects an invalid date string", () => {
    expect(isDobAcceptable("not-a-date").ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// G3 — Adjustment-note rule (mirrors validate_payroll_adjustment_note)
// ---------------------------------------------------------------------------
interface AdjustmentRow {
  entry_hours: number;
  new_value: number;
  note: string | null;
}
function isAdjustmentAllowed(row: AdjustmentRow): boolean {
  if ((row.new_value ?? 0) === 0) return true;
  if ((row.entry_hours ?? 0) === 0) {
    return !!row.note && row.note.trim().length > 0;
  }
  return true;
}

describe("G3 — payroll adjustment note requirement", () => {
  it("rejects a zero-hour, non-zero-value adjustment with no note", () => {
    expect(
      isAdjustmentAllowed({ entry_hours: 0, new_value: 100, note: null }),
    ).toBe(false);
    expect(
      isAdjustmentAllowed({ entry_hours: 0, new_value: 100, note: "   " }),
    ).toBe(false);
  });
  it("accepts a zero-hour, non-zero-value adjustment with a real note", () => {
    expect(
      isAdjustmentAllowed({
        entry_hours: 0,
        new_value: 100,
        note: "Q2 retention bonus, approved by GM",
      }),
    ).toBe(true);
  });
  it("does not require a note when there are worked hours", () => {
    expect(
      isAdjustmentAllowed({ entry_hours: 40, new_value: 50, note: null }),
    ).toBe(true);
  });
  it("does not require a note when the value is zero", () => {
    expect(
      isAdjustmentAllowed({ entry_hours: 0, new_value: 0, note: null }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// G4 — SC eligibility approval block honours per-line override notes
// ---------------------------------------------------------------------------
describe("G4 — service-charge eligibility approval block", () => {
  it("blocks approval when SC is paid to an ineligible employee with no override", () => {
    const r = buildPayrollPeriodReport(
      PERIOD,
      [entry({ service_charge: 1.5 })],
      new Map([["emp1", [term()]]]),
    );
    const cl = buildApprovalChecklist({
      period_status: "draft",
      entries: r.entries,
      scIneligibleEntryIds: new Set(["e1"]),
    });
    const item = cl.items.find((i) => i.id === "sc_paid_to_ineligible");
    expect(item?.status).toBe("block");
    expect(canApprove(cl, new Set(cl.ack_required_ids))).toBe(false);
  });

  it("does NOT block when an explicit per-line override note exists", () => {
    const r = buildPayrollPeriodReport(
      PERIOD,
      [entry({ service_charge: 1.5 })],
      new Map([["emp1", [term()]]]),
    );
    const cl = buildApprovalChecklist({
      period_status: "draft",
      entries: r.entries,
      scIneligibleEntryIds: new Set(["e1"]),
      scOverrideNoteEntryIds: new Set(["e1"]),
    });
    const block = cl.items.find((i) => i.id === "sc_paid_to_ineligible");
    const warn = cl.items.find(
      (i) => i.id === "sc_eligibility_override_in_use",
    );
    expect(block?.status).toBe("pass");
    expect(warn?.status).toBe("warning");
    expect(warn?.requires_ack).toBe(true);
  });

  it("ignores ineligible employees who were not actually paid SC", () => {
    const r = buildPayrollPeriodReport(
      PERIOD,
      [entry({ service_charge: 0 })],
      new Map([["emp1", [term()]]]),
    );
    const cl = buildApprovalChecklist({
      period_status: "draft",
      entries: r.entries,
      scIneligibleEntryIds: new Set(["e1"]),
    });
    expect(cl.items.find((i) => i.id === "sc_paid_to_ineligible")?.status).toBe(
      "pass",
    );
  });
});
