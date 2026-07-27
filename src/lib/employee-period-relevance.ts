/**
 * Period-aware Starter / Leaver / Former-employee relevance helpers.
 *
 * SAFETY:
 * - Pure functions. No React, Supabase, React-Query, network or side effects.
 * - Never mutates employee records or persistent status.
 * - Never changes payroll, NMW, service-charge or holiday calculations —
 *   this module only DERIVES a period-specific view of who counts as a
 *   starter, a leaver, a former employee or "relevant" for a payroll period.
 *
 * The persistent `employees.status` value ("starter", "active", "leaver",
 *   "archived") remains the source of truth for HR lifecycle. These helpers
 *   translate that + period metadata + period activity into a period-scoped
 *   marker so payroll surfaces stop treating a person who started in a past
 *   period as a starter forever.
 */

export interface PeriodRelevanceEmployee {
  id: string;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface RelevancePeriod {
  start_date?: string | null;
  end_date?: string | null;
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function withinPeriod(dateValue: string | null | undefined, period: RelevancePeriod): boolean {
  const d = toDate(dateValue);
  const s = toDate(period.start_date);
  const e = toDate(period.end_date);
  if (!d || !s || !e) return false;
  return d >= s && d <= e;
}

/**
 * True only in the payroll period where the employee's employment start
 * date actually falls. If no start_date is recorded we fall back to
 * "first appearance": no prior payroll period contained this employee.
 */
export function isStarterInPeriod(
  employee: PeriodRelevanceEmployee,
  period: RelevancePeriod,
  priorPeriodEmployeeIds?: Set<string> | Iterable<string> | null,
): boolean {
  if (!employee?.id) return false;
  if (withinPeriod(employee.start_date, period)) return true;

  // Fallback for legacy records with no start_date — a starter is someone
  // whose id has NOT been seen in any prior payroll period.
  if (!employee.start_date) {
    const prior = priorPeriodEmployeeIds instanceof Set
      ? priorPeriodEmployeeIds
      : new Set(priorPeriodEmployeeIds ?? []);
    return !prior.has(employee.id);
  }
  return false;
}

export interface LeaverContext {
  /** Employee IDs that have a holiday-settlement payment in this period. */
  holidayPaymentEmployeeIds?: Set<string> | Iterable<string> | null;
  /** Employee IDs that have a payroll entry in this period. */
  entryEmployeeIds?: Set<string> | Iterable<string> | null;
}

/**
 * True only for the payroll period that contains the leaving date OR the
 * final holiday settlement OR clear leaver activity (payroll entry while
 * flagged as leaver). A stale leaver from months ago is not returned true
 * for every subsequent period.
 */
export function isLeaverInPeriod(
  employee: PeriodRelevanceEmployee,
  period: RelevancePeriod,
  context: LeaverContext = {},
): boolean {
  if (!employee?.id) return false;

  // End date falls inside the selected period.
  if (withinPeriod(employee.end_date, period)) return true;

  const entryIds = context.entryEmployeeIds instanceof Set
    ? context.entryEmployeeIds
    : new Set(context.entryEmployeeIds ?? []);

  const holidayIds = context.holidayPaymentEmployeeIds instanceof Set
    ? context.holidayPaymentEmployeeIds
    : new Set(context.holidayPaymentEmployeeIds ?? []);

  // A holiday payment on its own is NOT proof of leaving — normal
  // mid-employment holiday pay lands in the same table. Only treat it as
  // leaver evidence when the employee is persistently flagged as leaver.
  if (employee.status === "leaver" && holidayIds.has(employee.id)) return true;

  // Persistently flagged leaver with actual current-period activity
  // (final correction or clean-up run). No activity => not shown as
  // leaver in this period even though status is still "leaver".
  if (employee.status === "leaver" && entryIds.has(employee.id)) return true;

  return false;
}

/** True if the employee left before this period started. */
export function isFormerBeforePeriod(
  employee: PeriodRelevanceEmployee,
  period: RelevancePeriod,
): boolean {
  const end = toDate(employee?.end_date ?? null);
  const start = toDate(period.start_date);
  if (!end || !start) return false;
  return end < start;
}

export interface RelevanceContext extends LeaverContext {
  /** Manual adjustment / correction employee ids for this period. */
  adjustmentEmployeeIds?: Set<string> | Iterable<string> | null;
}

/**
 * Should this employee be considered part of the CURRENT payroll period
 * for warnings, seeding, missing-info and missing-from-file checks?
 *
 *   Included when ANY of:
 *     - Has a payroll entry in the period
 *     - Has a holiday-settlement payment in the period
 *     - Has a manual adjustment/correction in the period
 *     - Their leaving date falls inside the period
 *     - They are an active/starter employee who has not left before this period
 *
 *   Excluded when:
 *     - Archived
 *     - Left before this period AND no current-period activity
 */
export function isRelevantToPayrollPeriod(
  employee: PeriodRelevanceEmployee,
  period: RelevancePeriod,
  context: RelevanceContext = {},
): boolean {
  if (!employee?.id) return false;
  if (employee.status === "archived") {
    // Archived employees only remain relevant if they still have activity
    // in this specific period (e.g. a late correction).
    return hasCurrentPeriodActivity(employee.id, context);
  }

  if (hasCurrentPeriodActivity(employee.id, context)) return true;
  if (withinPeriod(employee.end_date, period)) return true;

  if (isFormerBeforePeriod(employee, period)) return false;

  return employee.status === "active" || employee.status === "starter";
}

function hasCurrentPeriodActivity(id: string, context: RelevanceContext): boolean {
  const entryIds = context.entryEmployeeIds instanceof Set
    ? context.entryEmployeeIds
    : new Set(context.entryEmployeeIds ?? []);
  if (entryIds.has(id)) return true;
  const holidayIds = context.holidayPaymentEmployeeIds instanceof Set
    ? context.holidayPaymentEmployeeIds
    : new Set(context.holidayPaymentEmployeeIds ?? []);
  if (holidayIds.has(id)) return true;
  const adjIds = context.adjustmentEmployeeIds instanceof Set
    ? context.adjustmentEmployeeIds
    : new Set(context.adjustmentEmployeeIds ?? []);
  if (adjIds.has(id)) return true;
  return false;
}
