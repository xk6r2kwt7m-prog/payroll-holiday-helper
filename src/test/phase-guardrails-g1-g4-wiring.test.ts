/**
 * G1 + G4 — live approval-page wiring regression tests.
 *
 * Asserts that the data-source resolver `resolveGuardrailSets`
 * (used by `usePayrollApprovalGuardrails` in the live Payroll page)
 * produces the correct `nmwOverrideEmployeeIds`, `scIneligibleEntryIds`,
 * and `scOverrideNoteEntryIds`, and that when those sets are passed into
 * `buildApprovalChecklist` the live-page-equivalent behaviour matches:
 *
 *   - NMW failure without override → BLOCK
 *   - NMW failure WITH override row → WARNING requiring ack
 *   - SC paid to ineligible without override note → BLOCK
 *   - SC paid to ineligible WITH override note → WARNING requiring ack
 *
 * No database is touched. No payroll data is modified.
 */
import { describe, it, expect } from "vitest";
import {
  resolveGuardrailSets,
  SC_ELIGIBILITY_OVERRIDE_FIELD,
} from "@/hooks/usePayrollApprovalGuardrails";
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
  period_name: "Wiring test",
  start_date: "2026-05-01",
  end_date: "2026-05-31",
  status: "pending",
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
// resolveGuardrailSets — the exact mapping the Payroll page uses
// ---------------------------------------------------------------------------
describe("approval-page wiring — data-source resolver", () => {
  it("maps contract_minimum_wage_overrides into nmwOverrideEmployeeIds", () => {
    const sets = resolveGuardrailSets({
      entries: [],
      contractOverrides: [{ employee_id: "emp1" }, { employee_id: "emp2" }],
      nmwAuditRows: [],
      scOverrideAdjustments: [],
    });
    expect(sets.nmwOverrideEmployeeIds.has("emp1")).toBe(true);
    expect(sets.nmwOverrideEmployeeIds.has("emp2")).toBe(true);
  });

  it("includes payroll_nmw_audit rows with a non-empty override_reason", () => {
    const sets = resolveGuardrailSets({
      entries: [],
      contractOverrides: [],
      nmwAuditRows: [
        { employee_id: "emp3", override_reason: "GM-approved trainee rate" },
        { employee_id: "emp4", override_reason: "" }, // empty → ignored
        { employee_id: "emp5", override_reason: null }, // null → ignored
      ],
      scOverrideAdjustments: [],
    });
    expect(sets.nmwOverrideEmployeeIds.has("emp3")).toBe(true);
    expect(sets.nmwOverrideEmployeeIds.has("emp4")).toBe(false);
    expect(sets.nmwOverrideEmployeeIds.has("emp5")).toBe(false);
  });

  it("flags entries paying SC where employees.service_charge_eligible = false", () => {
    const sets = resolveGuardrailSets({
      entries: [
        // Ineligible & paid SC → flagged
        { id: "e1", employee_id: "emp1", service_charge: 1.5, employees: { service_charge_eligible: false } },
        // Eligible & paid SC → NOT flagged
        { id: "e2", employee_id: "emp2", service_charge: 1.5, employees: { service_charge_eligible: true } },
        // Ineligible but no SC paid → NOT flagged
        { id: "e3", employee_id: "emp3", service_charge: 0, employees: { service_charge_eligible: false } },
        // Legacy null → treated as eligible (no false-positive)
        { id: "e4", employee_id: "emp4", service_charge: 2, employees: { service_charge_eligible: null } },
      ],
      contractOverrides: [],
      nmwAuditRows: [],
      scOverrideAdjustments: [],
    });
    expect(sets.scIneligibleEntryIds.has("e1")).toBe(true);
    expect(sets.scIneligibleEntryIds.has("e2")).toBe(false);
    expect(sets.scIneligibleEntryIds.has("e3")).toBe(false);
    expect(sets.scIneligibleEntryIds.has("e4")).toBe(false);
  });

  it("maps SC-eligibility override adjustments with non-empty notes", () => {
    const sets = resolveGuardrailSets({
      entries: [],
      contractOverrides: [],
      nmwAuditRows: [],
      scOverrideAdjustments: [
        { payroll_entry_id: "e1", field_name: SC_ELIGIBILITY_OVERRIDE_FIELD, note: "Covered shift on FOH" },
        { payroll_entry_id: "e2", field_name: SC_ELIGIBILITY_OVERRIDE_FIELD, note: "   " }, // blank → ignored
        { payroll_entry_id: "e3", field_name: SC_ELIGIBILITY_OVERRIDE_FIELD, note: null }, // null → ignored
        { payroll_entry_id: "e4", field_name: "hourly_rate", note: "Should not count" }, // wrong field
      ],
    });
    expect(sets.scOverrideNoteEntryIds.has("e1")).toBe(true);
    expect(sets.scOverrideNoteEntryIds.has("e2")).toBe(false);
    expect(sets.scOverrideNoteEntryIds.has("e3")).toBe(false);
    expect(sets.scOverrideNoteEntryIds.has("e4")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// End-to-end equivalent of Payroll.tsx caller
// ---------------------------------------------------------------------------
describe("approval-page wiring — checklist behaves correctly with live sets", () => {
  it("G1 fires in the live approval flow: NMW failure with NO override blocks", () => {
    const r = buildPayrollPeriodReport(
      PERIOD,
      [entry({ hourly_rate: 9, service_charge: 0 })],
      new Map([["emp1", [term()]]]),
    );
    const sets = resolveGuardrailSets({
      entries: [{ id: "e1", employee_id: "emp1", service_charge: 0, employees: { service_charge_eligible: true } }],
      contractOverrides: [],
      nmwAuditRows: [],
      scOverrideAdjustments: [],
    });
    const cl = buildApprovalChecklist({
      period_status: "pending",
      entries: r.entries,
      ...sets,
    });
    expect(cl.items.find((i) => i.id === "nmw_non_compliant")?.status).toBe("block");
    expect(canApprove(cl, new Set(cl.ack_required_ids))).toBe(false);
  });

  it("G1 fires in the live approval flow: NMW failure WITH override → warning, needs ack", () => {
    const r = buildPayrollPeriodReport(
      PERIOD,
      [entry({ hourly_rate: 9, service_charge: 0 })],
      new Map([["emp1", [term()]]]),
    );
    const sets = resolveGuardrailSets({
      entries: [{ id: "e1", employee_id: "emp1", service_charge: 0, employees: { service_charge_eligible: true } }],
      contractOverrides: [{ employee_id: "emp1" }],
      nmwAuditRows: [],
      scOverrideAdjustments: [],
    });
    const cl = buildApprovalChecklist({
      period_status: "pending",
      entries: r.entries,
      ...sets,
    });
    expect(cl.items.find((i) => i.id === "nmw_non_compliant")?.status).toBe("pass");
    const warn = cl.items.find((i) => i.id === "nmw_override_in_use");
    expect(warn?.status).toBe("warning");
    expect(warn?.requires_ack).toBe(true);
  });

  it("G4 fires in the live approval flow: SC paid to ineligible blocks", () => {
    const r = buildPayrollPeriodReport(
      PERIOD,
      [entry({ service_charge: 1.5 })],
      new Map([["emp1", [term()]]]),
    );
    const sets = resolveGuardrailSets({
      entries: [{ id: "e1", employee_id: "emp1", service_charge: 1.5, employees: { service_charge_eligible: false } }],
      contractOverrides: [],
      nmwAuditRows: [],
      scOverrideAdjustments: [],
    });
    const cl = buildApprovalChecklist({
      period_status: "pending",
      entries: r.entries,
      ...sets,
    });
    expect(cl.items.find((i) => i.id === "sc_paid_to_ineligible")?.status).toBe("block");
    expect(canApprove(cl, new Set(cl.ack_required_ids))).toBe(false);
  });

  it("G4 fires in the live approval flow: per-line override note unblocks but warns", () => {
    const r = buildPayrollPeriodReport(
      PERIOD,
      [entry({ service_charge: 1.5 })],
      new Map([["emp1", [term()]]]),
    );
    const sets = resolveGuardrailSets({
      entries: [{ id: "e1", employee_id: "emp1", service_charge: 1.5, employees: { service_charge_eligible: false } }],
      contractOverrides: [],
      nmwAuditRows: [],
      scOverrideAdjustments: [
        {
          payroll_entry_id: "e1",
          field_name: SC_ELIGIBILITY_OVERRIDE_FIELD,
          note: "Acting cover for FOH shift, GM-approved",
        },
      ],
    });
    const cl = buildApprovalChecklist({
      period_status: "pending",
      entries: r.entries,
      ...sets,
    });
    expect(cl.items.find((i) => i.id === "sc_paid_to_ineligible")?.status).toBe("pass");
    const warn = cl.items.find((i) => i.id === "sc_eligibility_override_in_use");
    expect(warn?.status).toBe("warning");
    expect(warn?.requires_ack).toBe(true);
  });

  it("clean period with no overrides and SC-eligible staff approves cleanly", () => {
    const r = buildPayrollPeriodReport(
      PERIOD,
      [entry()],
      new Map([["emp1", [term()]]]),
    );
    const sets = resolveGuardrailSets({
      entries: [{ id: "e1", employee_id: "emp1", service_charge: 1.5, employees: { service_charge_eligible: true } }],
      contractOverrides: [],
      nmwAuditRows: [],
      scOverrideAdjustments: [],
    });
    const cl = buildApprovalChecklist({
      period_status: "pending",
      entries: r.entries,
      ...sets,
    });
    expect(cl.blocking_count).toBe(0);
    expect(canApprove(cl, new Set(cl.ack_required_ids))).toBe(true);
  });
});
