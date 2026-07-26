/**
 * Payroll Month-on-Month Smart Change Review — pure logic.
 *
 * Compares the current payroll period against the immediately previous
 * payroll period and surfaces meaningful changes for the manager. This
 * module never mutates payroll data, never touches calculations, NMW,
 * service-charge allocation, or holiday logic. It only classifies.
 *
 * Hours are normalised by payroll-period length so a 4-week vs 5-week
 * period does NOT create a false warning when weekly average is stable.
 */

export type ChangeSeverity = "none" | "info" | "amber" | "red";

export interface PeriodInfo {
  id: string;
  start_date: string;
  end_date: string;
  status?: string | null;
}

export interface CompareEntry {
  entry_id: string;
  employee_id: string;
  hourly_rate: number;
  service_charge: number;
  timesheet_hours: number;
  performance_bonus: number;
  special_bonus: number;
  holiday_pay: number;
  total_pay: number;
  /** True when the current-period entry has no matching row in the
   *  imported timesheet (i.e. `imported_hours` is null on an active
   *  employee whose prior period had hours). */
  missing_from_import?: boolean;
  is_new_starter?: boolean;
  is_leaver?: boolean;
  status?: string | null;
}

export interface EmployeeChangeField {
  prev: number;
  curr: number;
  diff: number;
  pct: number | null;
  changed: boolean;
  severity: ChangeSeverity;
  message?: string;
}

export interface EmployeeHoursChange {
  prev_total: number;
  curr_total: number;
  prev_weeks: number;
  curr_weeks: number;
  prev_weekly_avg: number;
  curr_weekly_avg: number;
  pct_weekly_change: number | null;
  severity: ChangeSeverity;
  zero_hours_but_had_hours: boolean;
  missing_from_timesheet: boolean;
  message?: string;
}

export interface EmployeeChange {
  employee_id: string;
  entry_id: string | null;
  is_new_starter: boolean;
  is_leaver: boolean;
  rate: EmployeeChangeField;
  service_charge: EmployeeChangeField;
  bonus: EmployeeChangeField;
  holiday_pay: EmployeeChangeField;
  gross_pay: EmployeeChangeField;
  hours: EmployeeHoursChange;
  manual_adjustment_count: number;
  /** Highest severity across all fields, for the row highlight. */
  overall_severity: ChangeSeverity;
}

export interface PayrollComparisonSummary {
  rate_changes: number;
  service_charge_changes: number;
  zero_hours_with_prior_hours: number;
  missing_from_timesheet: number;
  new_starters: number;
  leavers: number;
  large_weekly_hours_movement: number;
  large_gross_pay_movement: number;
  /** Total payroll_period_notes for the current period. */
  total_notes: number;
  /** Notes flagged `show_on_pdf = true`. */
  pdf_visible_notes: number;
  /** total_notes - pdf_visible_notes. */
  internal_only_notes: number;
  has_previous_period: boolean;
}

export interface PayrollComparison {
  has_previous_period: boolean;
  current_period_weeks: number;
  previous_period_weeks: number;
  changes: Map<string, EmployeeChange>;
  summary: PayrollComparisonSummary;
}

export const CHANGE_THRESHOLDS = {
  /** Weekly-average hours movement above this percentage is flagged. */
  WEEKLY_HOURS_PCT: 25,
  /** Gross pay movement above this percentage is flagged. */
  GROSS_PAY_PCT: 25,
  /** Numeric tolerance for "same" money values (pence). */
  MONEY_EPSILON: 0.005,
  /** Numeric tolerance for "same" hours. */
  HOURS_EPSILON: 0.01,
} as const;

/* -------------------------------------------------------------------------- */

export function weeksInPeriod(period: PeriodInfo): number {
  const start = new Date(period.start_date + "T00:00:00Z").getTime();
  const end = new Date(period.end_date + "T00:00:00Z").getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  const days = Math.round((end - start) / 86_400_000) + 1;
  const weeks = Math.max(1, Math.round(days / 7));
  return weeks;
}

function pctChange(prev: number, curr: number): number | null {
  if (Math.abs(prev) < 0.0001) {
    if (Math.abs(curr) < 0.0001) return 0;
    return null; // undefined % — prev is zero, curr is not
  }
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function money(a: number, b: number): boolean {
  return Math.abs((a || 0) - (b || 0)) > CHANGE_THRESHOLDS.MONEY_EPSILON;
}

function fmtMoney(v: number): string {
  return `£${(v || 0).toFixed(2)}`;
}

function highest(a: ChangeSeverity, b: ChangeSeverity): ChangeSeverity {
  const order: ChangeSeverity[] = ["none", "info", "amber", "red"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

/* -------------------------------------------------------------------------- */

export interface BuildComparisonInput {
  currentPeriod: PeriodInfo;
  currentEntries: CompareEntry[];
  previousPeriod?: PeriodInfo | null;
  previousEntries?: CompareEntry[];
  /** Count of manual adjustment rows per current-period entry_id. */
  manualAdjustmentsByEntryId?: Map<string, number>;
  /** Number of `payroll_period_notes` for the current period with
   *  `show_on_pdf = true`. Surfaced in the approval summary only. */
  pdfVisibleNotesCount?: number;
  /** Total number of `payroll_period_notes` for the current period. */
  totalNotesCount?: number;
  /** Optional set of employee_ids that appeared in ANY prior period.
   *  Used to distinguish a genuine new starter from a returning employee. */
  everSeenEmployeeIds?: Set<string>;
}

export function buildPeriodComparison(input: BuildComparisonInput): PayrollComparison {
  const {
    currentPeriod,
    currentEntries,
    previousPeriod,
    previousEntries = [],
    manualAdjustmentsByEntryId,
    pdfVisibleNotesCount = 0,
    totalNotesCount = 0,
    everSeenEmployeeIds,
  } = input;

  const curWeeks = weeksInPeriod(currentPeriod);
  const prevWeeks = previousPeriod ? weeksInPeriod(previousPeriod) : curWeeks;
  const hasPrev = !!previousPeriod && previousEntries.length > 0;

  const prevByEmployee = new Map<string, CompareEntry>();
  for (const e of previousEntries) prevByEmployee.set(e.employee_id, e);

  const changes = new Map<string, EmployeeChange>();

  for (const curr of currentEntries) {
    const prev = prevByEmployee.get(curr.employee_id);
    const isLeaver = curr.is_leaver ?? curr.status === "leaver";
    const isNewStarter = !!(
      curr.is_new_starter ??
      (curr.status === "starter" &&
        !prev &&
        (!everSeenEmployeeIds || !everSeenEmployeeIds.has(curr.employee_id)))
    );

    // --- rate ---
    const rateChanged = !!prev && money(prev.hourly_rate, curr.hourly_rate);
    const rate: EmployeeChangeField = {
      prev: prev?.hourly_rate ?? 0,
      curr: curr.hourly_rate,
      diff: curr.hourly_rate - (prev?.hourly_rate ?? curr.hourly_rate),
      pct: prev ? pctChange(prev.hourly_rate, curr.hourly_rate) : null,
      changed: rateChanged,
      severity: rateChanged ? "amber" : "none",
      message: rateChanged
        ? `Rate changed from ${fmtMoney(prev!.hourly_rate)} to ${fmtMoney(curr.hourly_rate)}`
        : undefined,
    };

    // --- service charge ---
    const scChanged = !!prev && money(prev.service_charge, curr.service_charge);
    const sc: EmployeeChangeField = {
      prev: prev?.service_charge ?? 0,
      curr: curr.service_charge,
      diff: curr.service_charge - (prev?.service_charge ?? curr.service_charge),
      pct: prev ? pctChange(prev.service_charge, curr.service_charge) : null,
      changed: scChanged,
      severity: scChanged ? "amber" : "none",
      message: scChanged
        ? `Service charge changed from ${fmtMoney(prev!.service_charge)} to ${fmtMoney(curr.service_charge)}`
        : undefined,
    };

    // --- bonus (perf + spec combined) ---
    const prevBonus = (prev?.performance_bonus ?? 0) + (prev?.special_bonus ?? 0);
    const currBonus = (curr.performance_bonus || 0) + (curr.special_bonus || 0);
    const bonusChanged = money(prevBonus, currBonus);
    const bonus: EmployeeChangeField = {
      prev: prevBonus,
      curr: currBonus,
      diff: currBonus - prevBonus,
      pct: pctChange(prevBonus, currBonus),
      changed: bonusChanged,
      severity: bonusChanged ? "info" : "none",
    };

    // --- holiday pay ---
    const hpChanged = money(prev?.holiday_pay ?? 0, curr.holiday_pay || 0);
    const holiday_pay: EmployeeChangeField = {
      prev: prev?.holiday_pay ?? 0,
      curr: curr.holiday_pay || 0,
      diff: (curr.holiday_pay || 0) - (prev?.holiday_pay ?? 0),
      pct: prev ? pctChange(prev.holiday_pay || 0, curr.holiday_pay || 0) : null,
      changed: hpChanged,
      severity: hpChanged ? "info" : "none",
    };

    // --- hours (period-length aware) ---
    const prevTot = prev?.timesheet_hours ?? 0;
    const currTot = curr.timesheet_hours || 0;
    const prevAvg = prevTot / Math.max(1, prevWeeks);
    const currAvg = currTot / Math.max(1, curWeeks);
    const weeklyPct = pctChange(prevAvg, currAvg);

    const hadHoursPrev = prevTot > CHANGE_THRESHOLDS.HOURS_EPSILON;
    const noHoursNow = currTot <= CHANGE_THRESHOLDS.HOURS_EPSILON;
    const zeroWithPrior = hasPrev && hadHoursPrev && noHoursNow && !isNewStarter && !isLeaver;

    let missingFromTimesheet = false;
    if (curr.missing_from_import && hasPrev && hadHoursPrev && !isNewStarter && !isLeaver) {
      missingFromTimesheet = true;
    }

    let hoursSev: ChangeSeverity = "none";
    let hoursMsg: string | undefined;
    if (zeroWithPrior) {
      hoursSev = "red";
      hoursMsg = `0.00h this period; had ${prevTot.toFixed(2)}h last period`;
    } else if (missingFromTimesheet) {
      hoursSev = "red";
      hoursMsg = "Employee missing from imported timesheet";
    } else if (
      hasPrev &&
      weeklyPct !== null &&
      Math.abs(weeklyPct) > CHANGE_THRESHOLDS.WEEKLY_HOURS_PCT &&
      !isNewStarter &&
      !isLeaver
    ) {
      hoursSev = "amber";
      hoursMsg = `Weekly avg ${prevAvg.toFixed(1)}h → ${currAvg.toFixed(1)}h (${weeklyPct > 0 ? "+" : ""}${weeklyPct.toFixed(0)}%)`;
    } else if (hasPrev && weeklyPct === null && currAvg > 0 && !isNewStarter) {
      // Prev weekly avg zero, curr positive — informational only.
      hoursSev = "info";
    }

    const hours: EmployeeHoursChange = {
      prev_total: prevTot,
      curr_total: currTot,
      prev_weeks: prevWeeks,
      curr_weeks: curWeeks,
      prev_weekly_avg: prevAvg,
      curr_weekly_avg: currAvg,
      pct_weekly_change: weeklyPct,
      severity: hoursSev,
      zero_hours_but_had_hours: zeroWithPrior,
      missing_from_timesheet: missingFromTimesheet,
      message: hoursMsg,
    };

    // --- gross pay ---
    const prevGross = prev?.total_pay ?? 0;
    const currGross = curr.total_pay || 0;
    const grossPct = pctChange(prevGross, currGross);
    const grossChanged = money(prevGross, currGross);
    let grossSev: ChangeSeverity = "none";
    if (
      hasPrev &&
      grossPct !== null &&
      Math.abs(grossPct) > CHANGE_THRESHOLDS.GROSS_PAY_PCT &&
      !isNewStarter &&
      !isLeaver
    ) {
      grossSev = "amber";
    } else if (grossChanged) {
      grossSev = "info";
    }
    const gross_pay: EmployeeChangeField = {
      prev: prevGross,
      curr: currGross,
      diff: currGross - prevGross,
      pct: grossPct,
      changed: grossChanged,
      severity: grossSev,
    };

    const manual_adjustment_count = manualAdjustmentsByEntryId?.get(curr.entry_id) ?? 0;

    const overall_severity = [
      rate.severity,
      sc.severity,
      bonus.severity,
      holiday_pay.severity,
      hours.severity,
      gross_pay.severity,
    ].reduce<ChangeSeverity>((acc, s) => highest(acc, s), "none");

    changes.set(curr.employee_id, {
      employee_id: curr.employee_id,
      entry_id: curr.entry_id,
      is_new_starter: isNewStarter,
      is_leaver: !!isLeaver,
      rate,
      service_charge: sc,
      bonus,
      holiday_pay,
      gross_pay,
      hours,
      manual_adjustment_count,
      overall_severity,
    });
  }

  const summary = summarizeComparison(changes, {
    hasPrev,
    pdfVisibleNotesCount,
    totalNotesCount,
  });

  return {
    has_previous_period: hasPrev,
    current_period_weeks: curWeeks,
    previous_period_weeks: prevWeeks,
    changes,
    summary,
  };
}

export function summarizeComparison(
  changes: Map<string, EmployeeChange>,
  opts: { hasPrev: boolean; pdfVisibleNotesCount: number; totalNotesCount?: number },
): PayrollComparisonSummary {
  let rate_changes = 0;
  let service_charge_changes = 0;
  let zero_hours_with_prior_hours = 0;
  let missing_from_timesheet = 0;
  let new_starters = 0;
  let leavers = 0;
  let large_weekly_hours_movement = 0;
  let large_gross_pay_movement = 0;

  for (const c of changes.values()) {
    if (c.rate.changed) rate_changes++;
    if (c.service_charge.changed) service_charge_changes++;
    if (c.hours.zero_hours_but_had_hours) zero_hours_with_prior_hours++;
    if (c.hours.missing_from_timesheet) missing_from_timesheet++;
    if (c.is_new_starter) new_starters++;
    if (c.is_leaver) leavers++;
    if (c.hours.severity === "amber") large_weekly_hours_movement++;
    if (c.gross_pay.severity === "amber") large_gross_pay_movement++;
  }

  const pdf_visible_notes = opts.pdfVisibleNotesCount;
  const total_notes = Math.max(opts.totalNotesCount ?? pdf_visible_notes, pdf_visible_notes);
  const internal_only_notes = Math.max(0, total_notes - pdf_visible_notes);

  return {
    rate_changes,
    service_charge_changes,
    zero_hours_with_prior_hours,
    missing_from_timesheet,
    new_starters,
    leavers,
    large_weekly_hours_movement,
    large_gross_pay_movement,
    total_notes,
    pdf_visible_notes,
    internal_only_notes,
    has_previous_period: opts.hasPrev,
  };
}
