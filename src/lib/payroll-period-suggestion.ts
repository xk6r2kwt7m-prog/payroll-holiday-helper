/**
 * Auto-suggest next payroll period dates.
 *
 * Rules confirmed by the Admin:
 * - The period cutoff is ALWAYS a Sunday.
 * - A period is normally 4 weeks, occasionally 5 weeks (explicit choice).
 * - The pay date is normally the last Thursday of the cutoff month.
 *
 * The cycle length is never inferred silently: the caller passes 4 or 5 and
 * the suggestion is derived deterministically from the previous cutoff.
 *
 * ---------------------------------------------------------------------------
 * ALL arithmetic here is in UTC, deliberately.
 *
 * Payroll dates are calendar dates ("2026-07-19"), not moments in time. Mixing
 * the browser's local timezone into that arithmetic shifts a date by one day
 * whenever the clock is offset from UTC — during British Summer Time a pay date
 * built locally and then written out came back a day early. Every date below is
 * therefore built and read with UTC helpers only.
 * ---------------------------------------------------------------------------
 */

/** Parse a calendar date string ("YYYY-MM-DD") as UTC midnight. */
function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function getLastDayOfWeek(year: number, month: number, dayOfWeek: number): Date {
  // dayOfWeek: 0=Sun, 4=Thu
  const lastDay = utcDate(year, month + 1, 0);
  const diff = (lastDay.getUTCDay() - dayOfWeek + 7) % 7;
  return addDays(lastDay, -diff);
}

export function getLastThursday(year: number, month: number): Date {
  return getLastDayOfWeek(year, month, 4);
}

/** Returns the Sunday on or after the given date. */
function getSundayOnOrAfter(date: Date): Date {
  return addDays(date, (7 - date.getUTCDay()) % 7);
}

/** Returns the last Sunday on or before the given date. */
function getLastSundayOnOrBefore(date: Date): Date {
  return addDays(date, -date.getUTCDay());
}

/**
 * Legacy helper retained for compatibility: the last Sunday on or before the
 * last Thursday of the month.
 */
export function getCutoffSunday(year: number, month: number): Date {
  return getLastSundayOnOrBefore(getLastThursday(year, month));
}

/** Calendar date as "YYYY-MM-DD", read in UTC so the day never shifts. */
export function toDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "September 2026" for the month a cutoff date falls in. */
export function periodNameForCutoff(cutoff: Date): string {
  return `${MONTH_NAMES[cutoff.getUTCMonth()]} ${cutoff.getUTCFullYear()}`;
}

/** Inclusive whole/partial weeks between two calendar dates, to one decimal. */
export function inclusiveWeeks(start: Date, end: Date): number {
  const days = (end.getTime() - start.getTime()) / 86_400_000 + 1;
  return Math.round((days / 7) * 10) / 10;
}

export interface SuggestedPeriod {
  periodName: string;
  startDate: string;
  endDate: string;
  payDate: string;
  periodWeeks: number;
}

/** Default cycle length in weeks. 5 is used occasionally, by explicit choice. */
export const DEFAULT_PERIOD_WEEKS = 4;

export function suggestNextPeriod(
  latestEndDate?: string | null,
  weeks: number = DEFAULT_PERIOD_WEEKS,
): SuggestedPeriod {
  const cycleWeeks = weeks === 5 ? 5 : 4;

  let startDate: Date;

  if (latestEndDate) {
    // Next period starts the day after the previous cutoff.
    startDate = addDays(parseDateOnly(latestEndDate), 1);
  } else {
    // No previous period — start from the beginning of the current month.
    const now = new Date();
    startDate = utcDate(now.getUTCFullYear(), now.getUTCMonth(), 1);
  }

  // Cutoff is always a Sunday: whole weeks from the start date, and if the
  // start date is not a Monday we still land the cutoff on a Sunday.
  const endDate = getSundayOnOrAfter(addDays(startDate, cycleWeeks * 7 - 1));

  // Pay date = last Thursday of the cutoff month.
  const payDate = getLastThursday(endDate.getUTCFullYear(), endDate.getUTCMonth());

  return {
    periodName: periodNameForCutoff(endDate),
    startDate: toDateStr(startDate),
    endDate: toDateStr(endDate),
    payDate: toDateStr(payDate),
    periodWeeks: inclusiveWeeks(startDate, endDate),
  };
}

/**
 * Period name, pay date and length derived from a pair of typed calendar dates.
 * Used by the New Period form so the values it fills in match the suggestion
 * engine exactly, in every timezone.
 */
export function derivePeriodFromDates(start: string, end: string): {
  periodName: string;
  payDate: string;
  periodWeeks: number;
} | null {
  if (!start || !end) return null;
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return {
    periodName: periodNameForCutoff(e),
    payDate: toDateStr(getLastThursday(e.getUTCFullYear(), e.getUTCMonth())),
    periodWeeks: inclusiveWeeks(s, e),
  };
}

/** True when a typed calendar date falls on a Sunday. */
export function isSundayDateStr(value: string): boolean {
  if (!value) return true;
  const d = parseDateOnly(value);
  return Number.isNaN(d.getTime()) ? true : d.getUTCDay() === 0;
}
