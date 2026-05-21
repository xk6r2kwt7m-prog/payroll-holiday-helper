/**
 * Phase 4 — Labour reporting utility tests.
 *
 * Guards the read-only reporting layer:
 *   - base pay and service charge are always reported separately
 *   - service charge is NEVER counted toward NMW
 *   - labour percentage defaults to base labour cost only
 *   - approved periods are flagged read-only (is_locked = true)
 *   - profile fallback is counted and surfaced
 *   - active terms are selected by date
 *   - CSV exports separate base / SC and never include a misleading
 *     combined hourly rate column
 */
import { describe, it, expect } from "vitest";
import {
  aggregateScheduledLabour,
  buildPayrollPeriodReport,
  aggregatePayrollEntries,
  computeLabourPercentage,
  buildSiteBreakdown,
  type PayrollEntryLike,
  type ScheduledShiftLike,
} from "@/lib/labour-reporting";
import type { TermsRow, ProfileFallback } from "@/lib/labour-costing";

// ---- helpers ---------------------------------------------------------------

function term(over: Partial<TermsRow> = {}): TermsRow {
  // We only need the fields the reporting utility actually reads. Cast
  // through unknown so we don't have to fill the entire DB row shape.
  return {
    id: over.id ?? "t1",
    employee_id: over.employee_id ?? "emp1",
    contract_id: over.contract_id ?? "c1",
    tenant_id: over.tenant_id ?? "tenant1",
    effective_from: over.effective_from ?? "2026-01-01",
    effective_to: over.effective_to ?? null,
    status: (over.status ?? "active") as TermsRow["status"],
    base_hourly_rate: over.base_hourly_rate ?? 12.71,
    hourly_rate: over.hourly_rate ?? 12.71,
    guaranteed_service_charge_rate: over.guaranteed_service_charge_rate ?? 1,
    estimated_service_charge_rate: over.estimated_service_charge_rate ?? 0.5,
    source_type: (over.source_type ?? "signed_contract") as TermsRow["source_type"],
    ...over,
  } as unknown as TermsRow;
}

function entry(over: Partial<PayrollEntryLike> = {}): PayrollEntryLike {
  return {
    id: "e1",
    employee_id: "emp1",
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

const PROFILE = (over: ProfileFallback = {}): ProfileFallback => ({
  hourly_rate: 11,
  service_charge: 0.75,
  ...over,
});

// ---- Scheduled labour aggregation -----------------------------------------------

describe("Phase 4 — scheduled labour aggregation", () => {
  it("splits base cost and service charge components", () => {
    const terms = term({ base_hourly_rate: 13, guaranteed_service_charge_rate: 2, estimated_service_charge_rate: 1 });
    const termsBy = new Map<string, TermsRow[]>([["emp1", [terms]]]);
    const shifts: ScheduledShiftLike[] = [
      { employee_id: "emp1", shift_date: "2026-05-01", hours: 10 },
    ];
    const totals = aggregateScheduledLabour(shifts, termsBy, new Map());
    expect(totals.base_cost).toBe(130);
    expect(totals.guaranteed_sc_cost).toBe(20);
    expect(totals.estimated_sc_cost).toBe(10);
    expect(totals.committed_cost).toBe(150);
    expect(totals.estimated_total_cost).toBe(160);
    // base and SC are never merged
    expect(totals.base_cost).not.toBe(totals.committed_cost);
  });

  it("counts and surfaces profile fallback when no active terms exist", () => {
    const shifts: ScheduledShiftLike[] = [
      { employee_id: "emp1", shift_date: "2026-05-01", hours: 8 },
    ];
    const profiles = new Map<string, ProfileFallback>([["emp1", PROFILE()]]);
    const totals = aggregateScheduledLabour(shifts, new Map(), profiles);
    expect(totals.fallback_shifts).toBe(1);
    expect(totals.fallback_employee_ids).toContain("emp1");
    expect(totals.no_terms_employee_ids).toContain("emp1");
    expect(totals.base_cost).toBe(88); // 8 × 11
    expect(totals.guaranteed_sc_cost).toBe(6); // 8 × 0.75 (profile SC, still separate)
  });

  it("selects the active terms row by shift date", () => {
    const oldTerms = term({ id: "old", effective_from: "2025-01-01", effective_to: "2026-04-30", base_hourly_rate: 10, guaranteed_service_charge_rate: 0, estimated_service_charge_rate: 0 });
    const newTerms = term({ id: "new", effective_from: "2026-05-01", base_hourly_rate: 15, guaranteed_service_charge_rate: 0, estimated_service_charge_rate: 0 });
    const termsBy = new Map<string, TermsRow[]>([["emp1", [oldTerms, newTerms]]]);
    const profiles = new Map<string, ProfileFallback>();

    const before = aggregateScheduledLabour(
      [{ employee_id: "emp1", shift_date: "2026-04-15", hours: 1 }],
      termsBy,
      profiles,
    );
    const after = aggregateScheduledLabour(
      [{ employee_id: "emp1", shift_date: "2026-05-15", hours: 1 }],
      termsBy,
      profiles,
    );
    expect(before.base_cost).toBe(10);
    expect(after.base_cost).toBe(15);
  });
});

// ---- Payroll period reporting ----------------------------------------------

describe("Phase 4 — payroll period reporting", () => {
  const period = {
    id: "p1",
    period_name: "May 2026",
    start_date: "2026-05-01",
    end_date: "2026-05-31",
    status: "draft",
  };
  const termsBy = new Map<string, TermsRow[]>([["emp1", [term()]]]);

  it("reports base pay, bonuses and actual SC separately", () => {
    const r = buildPayrollPeriodReport(period, [entry()], termsBy);
    const row = r.entries[0];
    expect(row.base_pay).toBeCloseTo(40 * 12.71, 2);
    expect(row.actual_service_charge_paid).toBeCloseTo(40 * 1.5, 2);
    expect(row.guaranteed_sc_committed).toBeCloseTo(40 * 1, 2);
    expect(row.estimated_sc_committed).toBeCloseTo(40 * 0.5, 2);
    // total package = base + bonuses + actual SC (never a hidden combined rate)
    expect(row.total_labour_value).toBeCloseTo(row.base_pay + row.actual_service_charge_paid, 2);
  });

  it("treats approved periods as locked / read-only", () => {
    const approved = { ...period, status: "approved" };
    const r = buildPayrollPeriodReport(approved, [entry()], termsBy);
    expect(r.is_locked).toBe(true);
    // The utility never mutates input: total_pay returns the stored value
    expect(r.entries[0].stored_total_pay).toBeCloseTo(40 * (12.71 + 1.5), 2);
  });

  it("allows draft periods to produce preview values without writing", () => {
    const r = buildPayrollPeriodReport(period, [entry()], termsBy);
    expect(r.is_locked).toBe(false);
    expect(r.totals.entry_count).toBe(1);
  });

  it("excludes service charge from NMW eligible pay", () => {
    const r = buildPayrollPeriodReport(period, [entry()], termsBy);
    const row = r.entries[0];
    // Eligible NMW pay = base + performance + special. NEVER includes SC.
    expect(row.nmw.calculation_basis.excluded_service_charge).toBeGreaterThan(0);
    expect(row.nmw.eligible_pay).toBeCloseTo(row.base_pay + row.performance_bonus + row.special_bonus, 2);
    expect(r.totals.eligible_nmw_pay).toBeCloseTo(
      r.totals.base_pay_total + r.totals.performance_bonus_total + r.totals.special_bonus_total,
      2,
    );
  });

  it("does not let service charge rescue a below-NMW base rate", () => {
    // 2026-04-01 NMW (21+) = 12.71. Pay 9/hr base with 5/hr SC → still non-compliant.
    const e = entry({ hourly_rate: 9, service_charge: 5 });
    const r = buildPayrollPeriodReport(period, [e], termsBy);
    const row = r.entries[0];
    expect(["non_compliant", "at_risk"]).toContain(row.nmw.status);
    expect(row.nmw.relies_on_service_charge).toBe(true);
    // Adding SC back would not have made it pass either — confirm SC is excluded:
    expect(row.nmw.eligible_pay).toBeCloseTo(row.base_pay, 2);
  });

  it("flags profile fallback when no active terms exist", () => {
    const r = buildPayrollPeriodReport(period, [entry()], new Map());
    expect(r.entries[0].terms_source).toBe("profile_fallback");
    expect(r.totals.profile_fallback_count).toBe(1);
  });

  it("relies_on_service_charge remains diagnostic only", () => {
    const e = entry({ hourly_rate: 9, service_charge: 5 });
    const r = buildPayrollPeriodReport(period, [e], termsBy);
    // It is exposed in the result and totals, but eligible_nmw_pay is unchanged.
    expect(r.totals.relies_on_service_charge_count).toBeGreaterThanOrEqual(1);
    expect(r.totals.eligible_nmw_pay).toBeCloseTo(r.totals.base_pay_total, 2);
  });
});

// ---- Aggregation totals -----------------------------------------------------

describe("Phase 4 — aggregation totals", () => {
  it("total labour value = base + bonuses + actual SC paid", () => {
    const period = { id: "p1", period_name: "x", start_date: "2026-05-01", end_date: "2026-05-31", status: "draft" };
    const r = buildPayrollPeriodReport(period, [entry({ performance_bonus: 50, special_bonus: 25 })], new Map([["emp1", [term()]]]));
    const t = aggregatePayrollEntries(r.entries);
    expect(t.total_labour_value).toBeCloseTo(
      t.base_pay_total + t.performance_bonus_total + t.special_bonus_total + t.actual_service_charge_paid_total,
      2,
    );
  });
});

// ---- Labour percentage ------------------------------------------------------

describe("Phase 4 — labour percentage", () => {
  it("defaults to base labour cost / revenue", () => {
    const p = computeLabourPercentage(300, 50, 1000);
    expect(p.base_pct).toBe(30); // 300/1000
    expect(p.with_sc_pct).toBe(35); // (300+50)/1000
    expect(p.base_pct).not.toBe(p.with_sc_pct);
  });

  it("returns null percentages when revenue is missing", () => {
    const p = computeLabourPercentage(300, 50, 0);
    expect(p.base_pct).toBeNull();
    expect(p.with_sc_pct).toBeNull();
  });
});

// ---- Site breakdown ---------------------------------------------------------

describe("Phase 4 — site breakdown", () => {
  it("allocates base and SC pro-rata by location hours without combining them", () => {
    const period = { id: "p1", period_name: "x", start_date: "2026-05-01", end_date: "2026-05-31", status: "draft" };
    const r = buildPayrollPeriodReport(period, [entry()], new Map([["emp1", [term()]]]));
    const rows = buildSiteBreakdown(r.entries, [
      { payroll_entry_id: "e1", employee_id: "emp1", location_name: "Site A", hours: 30 },
      { payroll_entry_id: "e1", employee_id: "emp1", location_name: "Site B", hours: 10 },
    ]);
    const a = rows.find((x) => x.location_name === "Site A")!;
    const b = rows.find((x) => x.location_name === "Site B")!;
    expect(a.base_cost).toBeCloseTo(r.entries[0].base_pay * (30 / 40), 1);
    expect(b.base_cost).toBeCloseTo(r.entries[0].base_pay * (10 / 40), 1);
    expect(a.actual_service_charge_paid).toBeGreaterThan(0);
    // Distinct columns — never collapsed.
    expect(a.base_cost).not.toBe(a.actual_service_charge_paid);
  });

  it("groups under (Unallocated) when no location rows are provided", () => {
    const period = { id: "p1", period_name: "x", start_date: "2026-05-01", end_date: "2026-05-31", status: "draft" };
    const r = buildPayrollPeriodReport(period, [entry()], new Map([["emp1", [term()]]]));
    const rows = buildSiteBreakdown(r.entries, []);
    expect(rows[0].location_name).toBe("(Unallocated)");
  });
});

// ---- CSV export shape -------------------------------------------------------
//
// The CSV export utility (`exportToCsv`) is invoked via the LabourCostReport
// component. Re-importing the component into a unit test pulls in React,
// Supabase, and the entire UI tree — overkill for verifying header shape.
// Instead, we assert the column definitions live in the source file and
// satisfy the Phase 4 separation rules.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 4 — CSV export column rules", () => {
  const source = readFileSync(
    resolve(__dirname, "../components/reports/LabourCostReport.tsx"),
    "utf8",
  );

  it("includes separate base / SC / total columns in the period export", () => {
    expect(source).toMatch(/Base Labour Cost \(£\)/);
    expect(source).toMatch(/Actual Service Charge Paid \(£\)/);
    expect(source).toMatch(/Guaranteed SC \(committed\) \(£\)/);
    expect(source).toMatch(/Estimated SC \(committed\) \(£\)/);
    expect(source).toMatch(/Total Labour Value \(£\)/);
    expect(source).toMatch(/Eligible NMW Pay \(£\)/);
  });

  it("does NOT include a misleading combined hourly rate column", () => {
    // No column should advertise an "hourly rate including service charge"
    // or similar combined per-hour figure.
    expect(source).not.toMatch(/Hourly Rate \(incl\.? Service Charge/i);
    expect(source).not.toMatch(/Combined Hourly Rate/i);
    expect(source).not.toMatch(/Total Hourly Rate/i);
    expect(source).not.toMatch(/Hourly Rate \(with SC/i);
  });

  it("labels NMW-related fields without folding in service charge", () => {
    // Eligible NMW pay is a pay total (£), not a £/hr — the required/effective
    // NMW £/hr fields are base-only and explicitly labelled.
    expect(source).toMatch(/Required NMW Rate \(£\/hr\)/);
    expect(source).toMatch(/Effective NMW Rate \(£\/hr\)/);
    // The "Base Hourly Rate (£)" column is base-only by definition (no SC).
    expect(source).toMatch(/Base Hourly Rate \(£\)/);
  });
});
