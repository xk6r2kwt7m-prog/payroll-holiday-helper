/**
 * Phase C — Payroll table filters, row-level badges and drawer-fallback helpers.
 *
 * Pure functions only. No side effects, no data mutation.
 *
 * These helpers exist so the payroll table can slice its rows and render
 * badges deterministically, without duplicating logic across UI, tests and
 * (future) mobile layouts. They must NEVER be used to change payroll
 * calculations — they only filter and label what is already there.
 */
import type { EmployeeChange } from "./payroll-change-review";

export type PayrollTableFilter =
  | "all"
  | "issues"
  | "pay_changes"
  | "zero_hours"
  | "holiday_pay"
  | "manual_adjustments"
  | "missing_timesheet";

export const PAYROLL_TABLE_FILTERS: { id: PayrollTableFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "issues", label: "Issues only" },
  { id: "pay_changes", label: "Pay changes" },
  { id: "zero_hours", label: "Zero hours" },
  { id: "holiday_pay", label: "Holiday pay" },
  { id: "manual_adjustments", label: "Manual adjustments" },
  { id: "missing_timesheet", label: "Missing timesheet" },
];

export interface FilterableEntry {
  id: string;
  employee_id: string;
  timesheet_hours: number;
  holiday_accrued_hours: number | null;
  adjustment_note: string | null;
  imported_hours: number | null;
}

export interface FilterContext {
  comparisonByEmployee?: Map<string, EmployeeChange>;
  adjustedEmployeeIds?: Set<string>;
  holidayPaidEmployeeIds?: Set<string>;
  nmwStatusByEmployee?: Map<string, "compliant" | "at_risk" | "non_compliant">;
}

function hasManualAdjustment(entry: FilterableEntry, ctx: FilterContext): boolean {
  if (ctx.adjustedEmployeeIds?.has(entry.employee_id)) return true;
  if (
    entry.imported_hours != null &&
    Math.abs(entry.timesheet_hours - entry.imported_hours) > 0.001
  ) {
    return true;
  }
  return false;
}

export function entryMatchesFilter(
  entry: FilterableEntry,
  filter: PayrollTableFilter,
  ctx: FilterContext,
): boolean {
  if (filter === "all") return true;
  const cmp = ctx.comparisonByEmployee?.get(entry.employee_id);
  const nmw = ctx.nmwStatusByEmployee?.get(entry.employee_id);
  const hasAdj = hasManualAdjustment(entry, ctx);
  const zero = Number(entry.timesheet_hours) === 0;
  const missing = !!cmp?.hours.missing_from_timesheet;

  switch (filter) {
    case "issues": {
      const cmpSevere =
        cmp?.overall_severity === "red" || cmp?.overall_severity === "amber";
      return (
        !!cmpSevere ||
        hasAdj ||
        zero ||
        missing ||
        nmw === "at_risk" ||
        nmw === "non_compliant"
      );
    }
    case "pay_changes":
      return !!(cmp?.rate.changed || cmp?.service_charge.changed);
    case "zero_hours":
      return zero;
    case "holiday_pay":
      return (
        !!ctx.holidayPaidEmployeeIds?.has(entry.employee_id) ||
        Number(entry.holiday_accrued_hours ?? 0) > 0
      );
    case "manual_adjustments":
      return hasAdj;
    case "missing_timesheet":
      return missing;
    default:
      return true;
  }
}

export function filterEntries<T extends FilterableEntry>(
  entries: T[],
  filter: PayrollTableFilter,
  ctx: FilterContext,
): T[] {
  if (filter === "all") return entries;
  return entries.filter((e) => entryMatchesFilter(e, filter, ctx));
}

export interface RowBadges {
  rateChanged: boolean;
  scChanged: boolean;
  missingTimesheet: boolean;
  zeroHours: boolean;
  holidayPay: boolean;
  manualAdjustment: boolean;
  nmwAtRisk: boolean;
  nmwFail: boolean;
  internalNote: boolean;
  /** True when the underlying hours movement is only "amber" i.e. review-only. */
  hoursReview: boolean;
  /** True when overall severity is "red" (high-risk). */
  highRisk: boolean;
}

export function computeRowBadges(
  entry: FilterableEntry,
  ctx: FilterContext,
): RowBadges {
  const cmp = ctx.comparisonByEmployee?.get(entry.employee_id);
  const nmw = ctx.nmwStatusByEmployee?.get(entry.employee_id);
  const hasAdj = hasManualAdjustment(entry, ctx);
  const zero = Number(entry.timesheet_hours) === 0;
  return {
    rateChanged: !!cmp?.rate.changed,
    scChanged: !!cmp?.service_charge.changed,
    missingTimesheet: !!cmp?.hours.missing_from_timesheet,
    zeroHours: zero,
    holidayPay:
      !!ctx.holidayPaidEmployeeIds?.has(entry.employee_id) ||
      Number(entry.holiday_accrued_hours ?? 0) > 0,
    manualAdjustment: hasAdj,
    nmwAtRisk: nmw === "at_risk",
    nmwFail: nmw === "non_compliant",
    internalNote: !!(entry.adjustment_note && entry.adjustment_note.trim().length > 0),
    hoursReview: cmp?.hours.severity === "amber",
    highRisk: cmp?.overall_severity === "red" || nmw === "non_compliant",
  };
}

/**
 * When the parent has no comparison entry for an employee (e.g. the very
 * first payroll period, or a brand-new starter), we still want the row
 * drawer to open. This returns a zero-diff EmployeeChange derived from the
 * current entry so the review dialog can render safely without pretending
 * anything changed.
 */
export function synthesizeZeroChange(input: {
  employee_id: string;
  entry_id: string;
  hourly_rate: number;
  service_charge: number;
  timesheet_hours: number;
  holiday_pay: number;
  bonus: number;
  gross_pay: number;
  is_new_starter?: boolean;
  is_leaver?: boolean;
}): EmployeeChange {
  const zeroField = (v: number) => ({
    prev: v,
    curr: v,
    diff: 0,
    pct: null as number | null,
    changed: false,
    severity: "none" as const,
  });
  return {
    employee_id: input.employee_id,
    entry_id: input.entry_id,
    is_new_starter: !!input.is_new_starter,
    is_leaver: !!input.is_leaver,
    rate: zeroField(input.hourly_rate),
    service_charge: zeroField(input.service_charge),
    bonus: zeroField(input.bonus),
    holiday_pay: zeroField(input.holiday_pay),
    gross_pay: zeroField(input.gross_pay),
    hours: {
      prev_total: input.timesheet_hours,
      curr_total: input.timesheet_hours,
      prev_weeks: 0,
      curr_weeks: 0,
      prev_weekly_avg: 0,
      curr_weekly_avg: 0,
      pct_weekly_change: null,
      severity: "none",
      zero_hours_but_had_hours: false,
      missing_from_timesheet: false,
    },
    manual_adjustment_count: 0,
    overall_severity: "none",
  };
}
