/**
 * Phase 4 — Labour reporting utility.
 *
 * Aggregates labour cost from two complementary sources:
 *
 *   1. Scheduled labour (rota): hours × resolved per-shift rates
 *      → uses `pickActiveTermsForDate` + `computeShiftLabourCost`
 *
 *   2. Payroll labour (paid): per-entry stored values in `payroll_entries`
 *      → base pay, performance bonus, special bonus (NMW-eligible)
 *      → service charge paid (NEVER NMW-eligible) is reported separately
 *
 * Hard rules — preserved from Phase 3:
 *   - National Minimum Wage NEVER counts service charge as eligible pay.
 *   - Service charge components (guaranteed / estimated / actually-paid) are
 *     always surfaced separately — never folded into a single hidden hourly
 *     rate.
 *   - Labour percentage uses BASE labour cost by default. A separate
 *     "total package %" can be computed but must be explicitly labelled.
 *   - No mutation of stored payroll values. This module is pure / read-only.
 *
 * This module is intentionally framework-free so it can be unit-tested in
 * isolation. React-Query hooks live in `src/hooks/useLabourCostReport.ts`.
 */
import {
  pickActiveTermsForDate,
  computeShiftLabourCost,
  type TermsRow,
  type ProfileFallback,
} from "@/lib/labour-costing";
import { evaluatePayrollEntryNmw, type NmwResult } from "@/lib/payroll-nmw";

/* -------------------------------------------------------------------------- */
/* Scheduled labour (rota-side) aggregation                                   */
/* -------------------------------------------------------------------------- */

export interface ScheduledShiftLike {
  employee_id: string | null;
  shift_date: string;
  hours: number;
  branch?: string | null;
  department?: string | null;
}

export interface ScheduledLabourTotals {
  shift_count: number;
  hours: number;
  base_cost: number;
  guaranteed_sc_cost: number;
  estimated_sc_cost: number;
  /** base + guaranteed SC (the genuinely-committed cost of the rota). */
  committed_cost: number;
  /** base + guaranteed + estimated SC (display only; labelled as estimate). */
  estimated_total_cost: number;
  fallback_shifts: number;
  fallback_employee_ids: string[];
  no_terms_employee_ids: string[];
}

/**
 * Aggregate a list of scheduled shifts into base + SC split totals.
 * `termsByEmployee` is typically produced by `useEmploymentTermsByEmployee`.
 */
export function aggregateScheduledLabour(
  shifts: ScheduledShiftLike[],
  termsByEmployee: Map<string, TermsRow[]>,
  profileByEmployee: Map<string, ProfileFallback>,
): ScheduledLabourTotals {
  const totals: ScheduledLabourTotals = {
    shift_count: 0,
    hours: 0,
    base_cost: 0,
    guaranteed_sc_cost: 0,
    estimated_sc_cost: 0,
    committed_cost: 0,
    estimated_total_cost: 0,
    fallback_shifts: 0,
    fallback_employee_ids: [],
    no_terms_employee_ids: [],
  };
  const fallbackSet = new Set<string>();
  const noTermsSet = new Set<string>();

  for (const s of shifts) {
    if (!s.employee_id) continue; // open shifts contribute no labour cost
    const empId = s.employee_id;
    const terms = pickActiveTermsForDate(
      termsByEmployee.get(empId),
      s.shift_date,
    );
    const fallback = profileByEmployee.get(empId) ?? {
      hourly_rate: 0,
      service_charge: 0,
    };
    const cost = computeShiftLabourCost(s.hours, terms, fallback);
    totals.shift_count += 1;
    totals.hours += cost.hours;
    totals.base_cost += cost.base_cost;
    totals.guaranteed_sc_cost += cost.guaranteed_sc_cost;
    totals.estimated_sc_cost += cost.estimated_sc_cost;
    if (cost.source === "profile_fallback") {
      totals.fallback_shifts += 1;
      fallbackSet.add(empId);
      if (!(termsByEmployee.get(empId)?.length)) noTermsSet.add(empId);
    }
  }
  totals.committed_cost = round2(totals.base_cost + totals.guaranteed_sc_cost);
  totals.estimated_total_cost = round2(
    totals.base_cost + totals.guaranteed_sc_cost + totals.estimated_sc_cost,
  );
  totals.base_cost = round2(totals.base_cost);
  totals.guaranteed_sc_cost = round2(totals.guaranteed_sc_cost);
  totals.estimated_sc_cost = round2(totals.estimated_sc_cost);
  totals.hours = round2(totals.hours);
  totals.fallback_employee_ids = [...fallbackSet];
  totals.no_terms_employee_ids = [...noTermsSet];
  return totals;
}

/* -------------------------------------------------------------------------- */
/* Payroll labour (paid-side) aggregation                                     */
/* -------------------------------------------------------------------------- */

export interface PayrollEntryLike {
  id: string;
  employee_id: string;
  employee_name: string;
  date_of_birth: string | null;
  is_apprentice?: boolean;
  timesheet_hours: number;
  hourly_rate: number;
  service_charge?: number | null;
  performance_bonus?: number | null;
  special_bonus?: number | null;
  total_pay?: number | null;
}

export interface PayrollEntryReport {
  entry_id: string;
  employee_id: string;
  employee_name: string;
  hours: number;
  /** Pay components — base pay is the only NMW-eligible "rate × hours" part. */
  base_pay: number;
  performance_bonus: number;
  special_bonus: number;
  /** Always reported separately. NEVER counted toward NMW. */
  actual_service_charge_paid: number;
  /** From active employment terms (if any). Display-only commitment view. */
  guaranteed_sc_committed: number;
  estimated_sc_committed: number;
  /** Stored grand total from `payroll_entries.total_pay` — never recomputed. */
  stored_total_pay: number;
  /** base pay + bonuses + actual SC paid. Clearly labelled as total package. */
  total_labour_value: number;
  /** Source of the rate used to compare against active terms. */
  terms_source: "employment_terms" | "profile_fallback";
  terms_id: string | null;
  /** NMW evaluation — eligible pay excludes SC. */
  nmw: NmwResult;
}

export interface PayrollPeriodReport {
  period_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
  is_locked: boolean;
  entries: PayrollEntryReport[];
  totals: PayrollLabourTotals;
}

export interface PayrollLabourTotals {
  entry_count: number;
  hours: number;
  base_pay_total: number;
  performance_bonus_total: number;
  special_bonus_total: number;
  /** Eligible NMW pay across the period = base + performance + special.
   *  Used as the denominator side for NMW assessment, never includes SC. */
  eligible_nmw_pay: number;
  /** Service charge actually paid through payroll (excluded from NMW). */
  actual_service_charge_paid_total: number;
  guaranteed_sc_committed_total: number;
  estimated_sc_committed_total: number;
  /** Sum of stored `total_pay` values. Authoritative paid figure. */
  stored_grand_total: number;
  /** base + bonuses + actual SC paid. Display only; labelled as total package. */
  total_labour_value: number;
  nmw_risk_count: number; // non_compliant
  nmw_at_risk_count: number;
  nmw_insufficient_data_count: number;
  relies_on_service_charge_count: number;
  profile_fallback_count: number;
}

/**
 * Build a per-entry payroll report for a single period. Stored values are
 * preserved verbatim — this function does not mutate or recompute totals.
 */
export function buildPayrollPeriodReport(
  period: {
    id: string;
    period_name: string;
    start_date: string;
    end_date: string;
    status: string;
  },
  entries: PayrollEntryLike[],
  termsByEmployee: Map<string, TermsRow[]>,
): PayrollPeriodReport {
  const is_locked = period.status === "approved";
  const out: PayrollEntryReport[] = [];

  for (const e of entries) {
    const hours = Number(e.timesheet_hours) || 0;
    const rate = Number(e.hourly_rate) || 0;
    const perf = Number(e.performance_bonus) || 0;
    const spec = Number(e.special_bonus) || 0;
    const scRate = Number(e.service_charge) || 0;
    const basePay = round2(hours * rate);
    const actualSc = round2(hours * scRate);

    const activeTerms = pickActiveTermsForDate(
      termsByEmployee.get(e.employee_id),
      period.start_date,
    );
    const guaranteedScRate = activeTerms
      ? Number(activeTerms.guaranteed_service_charge_rate ?? 0)
      : 0;
    const estimatedScRate = activeTerms
      ? Number(activeTerms.estimated_service_charge_rate ?? 0)
      : 0;
    const guaranteedScCommitted = round2(hours * guaranteedScRate);
    const estimatedScCommitted = round2(hours * estimatedScRate);

    const nmw = evaluatePayrollEntryNmw(
      {
        payroll_entry_id: e.id,
        employee_id: e.employee_id,
        employee_name: e.employee_name,
        date_of_birth: e.date_of_birth,
        is_apprentice: e.is_apprentice,
        timesheet_hours: hours,
        hourly_rate: rate,
        service_charge: actualSc, // flat SC paid (excluded from eligible)
        performance_bonus: perf,
        special_bonus: spec,
      },
      period.start_date,
    );

    out.push({
      entry_id: e.id,
      employee_id: e.employee_id,
      employee_name: e.employee_name,
      hours: round2(hours),
      base_pay: basePay,
      performance_bonus: round2(perf),
      special_bonus: round2(spec),
      actual_service_charge_paid: actualSc,
      guaranteed_sc_committed: guaranteedScCommitted,
      estimated_sc_committed: estimatedScCommitted,
      stored_total_pay: round2(Number(e.total_pay) || 0),
      total_labour_value: round2(basePay + perf + spec + actualSc),
      terms_source: activeTerms ? "employment_terms" : "profile_fallback",
      terms_id: activeTerms?.id ?? null,
      nmw,
    });
  }

  const totals = aggregatePayrollEntries(out);
  return {
    period_id: period.id,
    period_name: period.period_name,
    start_date: period.start_date,
    end_date: period.end_date,
    status: period.status,
    is_locked,
    entries: out,
    totals,
  };
}

export function aggregatePayrollEntries(
  rows: PayrollEntryReport[],
): PayrollLabourTotals {
  const t: PayrollLabourTotals = {
    entry_count: rows.length,
    hours: 0,
    base_pay_total: 0,
    performance_bonus_total: 0,
    special_bonus_total: 0,
    eligible_nmw_pay: 0,
    actual_service_charge_paid_total: 0,
    guaranteed_sc_committed_total: 0,
    estimated_sc_committed_total: 0,
    stored_grand_total: 0,
    total_labour_value: 0,
    nmw_risk_count: 0,
    nmw_at_risk_count: 0,
    nmw_insufficient_data_count: 0,
    relies_on_service_charge_count: 0,
    profile_fallback_count: 0,
  };
  for (const r of rows) {
    t.hours += r.hours;
    t.base_pay_total += r.base_pay;
    t.performance_bonus_total += r.performance_bonus;
    t.special_bonus_total += r.special_bonus;
    t.actual_service_charge_paid_total += r.actual_service_charge_paid;
    t.guaranteed_sc_committed_total += r.guaranteed_sc_committed;
    t.estimated_sc_committed_total += r.estimated_sc_committed;
    t.stored_grand_total += r.stored_total_pay;
    if (r.nmw.status === "non_compliant") t.nmw_risk_count += 1;
    if (r.nmw.status === "at_risk") t.nmw_at_risk_count += 1;
    if (r.nmw.status === "insufficient_data") t.nmw_insufficient_data_count += 1;
    if (r.nmw.relies_on_service_charge) t.relies_on_service_charge_count += 1;
    if (r.terms_source === "profile_fallback") t.profile_fallback_count += 1;
  }
  t.eligible_nmw_pay = round2(
    t.base_pay_total + t.performance_bonus_total + t.special_bonus_total,
  );
  t.total_labour_value = round2(t.eligible_nmw_pay + t.actual_service_charge_paid_total);
  t.hours = round2(t.hours);
  t.base_pay_total = round2(t.base_pay_total);
  t.performance_bonus_total = round2(t.performance_bonus_total);
  t.special_bonus_total = round2(t.special_bonus_total);
  t.actual_service_charge_paid_total = round2(t.actual_service_charge_paid_total);
  t.guaranteed_sc_committed_total = round2(t.guaranteed_sc_committed_total);
  t.estimated_sc_committed_total = round2(t.estimated_sc_committed_total);
  t.stored_grand_total = round2(t.stored_grand_total);
  return t;
}

/* -------------------------------------------------------------------------- */
/* Labour percentage                                                          */
/* -------------------------------------------------------------------------- */

export interface LabourPercentage {
  /** Base labour cost ÷ revenue. The default, NMW-aligned figure. */
  base_pct: number | null;
  /** (Base + actual SC paid) ÷ revenue. Always labelled as "with SC". */
  with_sc_pct: number | null;
  revenue: number;
  base_cost: number;
  total_with_sc: number;
}

export function computeLabourPercentage(
  baseCost: number,
  serviceChargeCost: number,
  revenue: number | null | undefined,
): LabourPercentage {
  const rev = Number(revenue) || 0;
  const totalWithSc = round2(baseCost + serviceChargeCost);
  return {
    base_cost: round2(baseCost),
    total_with_sc: totalWithSc,
    revenue: round2(rev),
    base_pct: rev > 0 ? round2((baseCost / rev) * 100) : null,
    with_sc_pct: rev > 0 ? round2((totalWithSc / rev) * 100) : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Site / location breakdown                                                  */
/* -------------------------------------------------------------------------- */

export interface PayrollLocationRow {
  payroll_entry_id: string;
  employee_id: string;
  location_name: string;
  hours: number;
}

export interface SiteBreakdownRow {
  location_name: string;
  hours: number;
  base_cost: number;
  guaranteed_sc_cost: number;
  estimated_sc_cost: number;
  actual_service_charge_paid: number;
  total_labour_value: number;
  fallback_count: number;
  nmw_risk_count: number;
}

/**
 * Allocate per-entry base/SC totals to locations using the location-hour split
 * from `payroll_entry_locations`. If an entry has no location rows, it is
 * grouped under "(Unallocated)". Allocation is pro-rata by hours.
 */
export function buildSiteBreakdown(
  entries: PayrollEntryReport[],
  locations: PayrollLocationRow[],
): SiteBreakdownRow[] {
  const byEntry = new Map<string, PayrollLocationRow[]>();
  for (const l of locations) {
    const list = byEntry.get(l.payroll_entry_id) ?? [];
    list.push(l);
    byEntry.set(l.payroll_entry_id, list);
  }

  const byLocation = new Map<string, SiteBreakdownRow>();
  const getRow = (name: string): SiteBreakdownRow => {
    let r = byLocation.get(name);
    if (!r) {
      r = {
        location_name: name,
        hours: 0,
        base_cost: 0,
        guaranteed_sc_cost: 0,
        estimated_sc_cost: 0,
        actual_service_charge_paid: 0,
        total_labour_value: 0,
        fallback_count: 0,
        nmw_risk_count: 0,
      };
      byLocation.set(name, r);
    }
    return r;
  };

  for (const entry of entries) {
    const locs = byEntry.get(entry.entry_id) ?? [];
    if (entry.hours <= 0) continue;
    const isFallback = entry.terms_source === "profile_fallback";
    const isNmwRisk = entry.nmw.status === "non_compliant";

    if (locs.length === 0) {
      const r = getRow("(Unallocated)");
      r.hours += entry.hours;
      r.base_cost += entry.base_pay;
      r.guaranteed_sc_cost += entry.guaranteed_sc_committed;
      r.estimated_sc_cost += entry.estimated_sc_committed;
      r.actual_service_charge_paid += entry.actual_service_charge_paid;
      if (isFallback) r.fallback_count += 1;
      if (isNmwRisk) r.nmw_risk_count += 1;
      continue;
    }
    const totalLocHours = locs.reduce((s, l) => s + l.hours, 0) || 1;
    for (const l of locs) {
      const share = l.hours / totalLocHours;
      const r = getRow(l.location_name);
      r.hours += l.hours;
      r.base_cost += entry.base_pay * share;
      r.guaranteed_sc_cost += entry.guaranteed_sc_committed * share;
      r.estimated_sc_cost += entry.estimated_sc_committed * share;
      r.actual_service_charge_paid += entry.actual_service_charge_paid * share;
      // count-based metrics: only credit to the location holding the largest share
    }
    const dominant = [...locs].sort((a, b) => b.hours - a.hours)[0];
    if (dominant) {
      const r = getRow(dominant.location_name);
      if (isFallback) r.fallback_count += 1;
      if (isNmwRisk) r.nmw_risk_count += 1;
    }
  }

  const rows = [...byLocation.values()].map((r) => ({
    ...r,
    hours: round2(r.hours),
    base_cost: round2(r.base_cost),
    guaranteed_sc_cost: round2(r.guaranteed_sc_cost),
    estimated_sc_cost: round2(r.estimated_sc_cost),
    actual_service_charge_paid: round2(r.actual_service_charge_paid),
    total_labour_value: round2(
      r.base_cost + r.actual_service_charge_paid,
    ),
  }));
  rows.sort((a, b) => b.total_labour_value - a.total_labour_value);
  return rows;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
