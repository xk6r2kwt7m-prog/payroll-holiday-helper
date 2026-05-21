/**
 * Phase 5 — Payroll approval, audit, and export readiness tests.
 *
 * Pure-logic coverage for `buildApprovalChecklist` and `canApprove`,
 * plus regression assertions that the existing CSV export shape
 * (verified end-to-end in Phase 4) still separates base pay from
 * service charge and never shows a misleading combined hourly rate.
 *
 * No mutation of payroll data is performed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildApprovalChecklist,
  canApprove,
  APPROVAL_CONFIRMATION_TEXT,
} from "@/lib/payroll-approval-checklist";
import {
  buildPayrollPeriodReport,
  type PayrollEntryLike,
} from "@/lib/labour-reporting";
import type { TermsRow, ProfileFallback } from "@/lib/labour-costing";

// ---- builders --------------------------------------------------------------

const PERIOD = {
  id: "p1",
  period_name: "May 2026",
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

function reportFor(entries: PayrollEntryLike[], terms?: TermsRow[]) {
  const map = new Map<string, TermsRow[]>();
  if (terms) map.set("emp1", terms);
  return buildPayrollPeriodReport(PERIOD, entries, map);
}

// ---- checklist: blocking ---------------------------------------------------

describe("Phase 5 — approval checklist blocking conditions", () => {
  it("blocks when a base rate is below NMW", () => {
    const r = reportFor([entry({ hourly_rate: 9, service_charge: 5 })], [term()]);
    const cl = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    const blockers = cl.items.filter((i) => i.blocking).map((i) => i.id);
    expect(blockers).toContain("nmw_non_compliant");
    expect(blockers).toContain("sc_below_nmw");
    expect(cl.blocking_count).toBeGreaterThanOrEqual(2);
  });

  it("blocks on missing rate (hours present but no base pay)", () => {
    const r = reportFor([entry({ hourly_rate: 0, service_charge: 0 })], [term()]);
    const cl = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    expect(cl.items.find((i) => i.id === "missing_rate")?.status).toBe("block");
  });

  it("blocks on negative pay values", () => {
    const r = reportFor([entry({ performance_bonus: -10 })], [term()]);
    const cl = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    expect(cl.items.find((i) => i.id === "negative_pay")?.status).toBe("block");
  });

  it("blocks on zero-hours entries with non-zero pay", () => {
    const r = reportFor(
      [entry({ timesheet_hours: 0, hourly_rate: 0, service_charge: 0, special_bonus: 100 })],
      [term()],
    );
    const cl = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    expect(cl.items.find((i) => i.id === "zero_hours_with_pay")?.status).toBe("block");
  });

  it("service charge cannot rescue a below-NMW base rate", () => {
    const r = reportFor([entry({ hourly_rate: 9, service_charge: 10 })], [term()]);
    const cl = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    // Both NMW status block AND SC-rescue block must fire.
    expect(cl.items.find((i) => i.id === "nmw_non_compliant")?.status).toBe("block");
    expect(cl.items.find((i) => i.id === "sc_below_nmw")?.status).toBe("block");
  });

  it("treats already-approved periods as blocked", () => {
    const r = reportFor([entry()], [term()]);
    const cl = buildApprovalChecklist({ period_status: "approved", entries: r.entries });
    expect(cl.period_already_approved).toBe(true);
    expect(cl.items.find((i) => i.id === "period_already_approved")?.status).toBe("block");
    expect(canApprove(cl, new Set())).toBe(false);
  });
});

// ---- checklist: warnings ---------------------------------------------------

describe("Phase 5 — approval checklist warnings", () => {
  it("warns on profile fallback rates", () => {
    const r = reportFor([entry()]); // no terms -> profile fallback
    const cl = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    const item = cl.items.find((i) => i.id === "profile_fallback");
    expect(item?.status).toBe("warning");
    expect(item?.requires_ack).toBe(true);
    expect(item?.count).toBe(1);
  });

  it("warns on employees without active terms", () => {
    const r = reportFor([entry()]);
    const cl = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    expect(cl.items.find((i) => i.id === "no_active_terms")?.status).toBe("warning");
  });

  it("warns on manual adjustments and requires acknowledgement", () => {
    const r = reportFor([entry()], [term()]);
    const adjustments = new Map<string, number>([["e1", 2]]);
    const cl = buildApprovalChecklist({
      period_status: "draft",
      entries: r.entries,
      manualAdjustmentsByEntryId: adjustments,
    });
    const item = cl.items.find((i) => i.id === "manual_adjustments");
    expect(item?.status).toBe("warning");
    expect(item?.count).toBe(2);
    expect(item?.requires_ack).toBe(true);
  });

  it("warnings require explicit acknowledgement before approval is allowed", () => {
    const r = reportFor([entry()]); // profile fallback + no_active_terms warnings
    const cl = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    expect(cl.blocking_count).toBe(0);
    // Without acks, approval is blocked.
    expect(canApprove(cl, new Set())).toBe(false);
    // Acknowledging every required warning unlocks approval.
    expect(canApprove(cl, new Set(cl.ack_required_ids))).toBe(true);
  });

  it("surfaces compliant SC-reliance entries as diagnostic warning only", () => {
    // A high-base + SC entry that nevertheless trips relies_on_service_charge
    // would surface as a warning, never a blocker. We assert the rule.
    const r = reportFor([entry()], [term()]);
    const clean = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    const diag = clean.items.find((i) => i.id === "sc_diagnostic");
    // Either pass (no diagnostic firing) or warning — must never be block.
    expect(diag && diag.status !== "block").toBe(true);
  });
});

// ---- approval gate ---------------------------------------------------------

describe("Phase 5 — approval gate", () => {
  it("approves cleanly when all checks pass and acks satisfied", () => {
    const r = reportFor([entry()], [term()]);
    const cl = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    expect(cl.blocking_count).toBe(0);
    expect(canApprove(cl, new Set(cl.ack_required_ids))).toBe(true);
  });

  it("never approves an already-approved period", () => {
    const r = reportFor([entry()], [term()]);
    const cl = buildApprovalChecklist({ period_status: "approved", entries: r.entries });
    expect(canApprove(cl, new Set(["period_already_approved", ...cl.ack_required_ids]))).toBe(false);
  });

  it("never approves with blockers, even with all acks ticked", () => {
    const r = reportFor([entry({ hourly_rate: 5 })], [term()]);
    const cl = buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    const everything = new Set(cl.items.map((i) => i.id));
    expect(canApprove(cl, everything)).toBe(false);
  });

  it("exposes the standard explicit-confirmation copy", () => {
    expect(APPROVAL_CONFIRMATION_TEXT).toMatch(/National Minimum Wage/);
    expect(APPROVAL_CONFIRMATION_TEXT).toMatch(/locked/);
    expect(APPROVAL_CONFIRMATION_TEXT).toMatch(/service charge/i);
  });
});

// ---- read-only / non-mutation ---------------------------------------------

describe("Phase 5 — checklist does not mutate inputs", () => {
  it("leaves entry pay values unchanged after building the checklist", () => {
    const e = entry();
    const r = reportFor([e], [term()]);
    const snapshot = JSON.parse(JSON.stringify(r.entries));
    buildApprovalChecklist({ period_status: "draft", entries: r.entries });
    expect(r.entries).toEqual(snapshot);
  });
});

// ---- locking / approval mutation — source-level regression -----------------
//
// The DB enforces locking via triggers and `usePayroll.ts` raises explicit
// "This payroll period is locked..." errors before any mutation. We assert
// the guard text remains in place so a refactor cannot silently remove it.

describe("Phase 5 — locking guards remain in usePayroll", () => {
  const source = readFileSync(
    resolve(__dirname, "../hooks/usePayroll.ts"),
    "utf8",
  );

  it("blocks edits on approved periods with a clear message", () => {
    expect(source).toMatch(/This payroll period is locked/);
    expect(source).toMatch(/Reopen the period first/);
  });

  it("audits approve and reopen actions", () => {
    expect(source).toMatch(/approve_and_lock/);
    expect(source).toMatch(/reopen_period/);
    // Both audit writes target audit_log.
    expect((source.match(/from\("audit_log"\)\.insert/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("approve mutation sets approved_at and approved_by", () => {
    expect(source).toMatch(/approved_by: user\?.id/);
    expect(source).toMatch(/approved_at: new Date\(\)\.toISOString\(\)/);
  });

  it("reopen clears approved_at and approved_by", () => {
    expect(source).toMatch(/approved_by: null/);
    expect(source).toMatch(/approved_at: null/);
  });
});

// ---- CSV / export regression -----------------------------------------------

describe("Phase 5 — labour-cost CSV export still safe", () => {
  const source = readFileSync(
    resolve(__dirname, "../components/reports/LabourCostReport.tsx"),
    "utf8",
  );

  it("CSV separates base pay and service charge components", () => {
    expect(source).toMatch(/Base Labour Cost \(£\)/);
    expect(source).toMatch(/Actual Service Charge Paid \(£\)/);
    expect(source).toMatch(/Guaranteed SC \(committed\) \(£\)/);
    expect(source).toMatch(/Estimated SC \(committed\) \(£\)/);
  });

  it("CSV excludes service charge from NMW eligible-pay column", () => {
    expect(source).toMatch(/Eligible NMW Pay \(£\)/);
    // The column is a £ total — not a per-hour rate — and is computed
    // upstream by `aggregatePayrollEntries` from base + bonuses only.
    // Phase 4 unit tests already prove the value excludes SC.
    expect(source).not.toMatch(/Hourly Rate \(incl\.? Service Charge/i);
  });

  it("CSV has no misleading combined hourly-rate column", () => {
    expect(source).not.toMatch(/Combined Hourly Rate/i);
    expect(source).not.toMatch(/Total Hourly Rate/i);
    expect(source).not.toMatch(/Hourly Rate \(with SC/i);
  });
});
