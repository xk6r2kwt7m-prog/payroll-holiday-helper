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
 */

function getLastDayOfWeek(year: number, month: number, dayOfWeek: number): Date {
  // dayOfWeek: 0=Sun, 4=Thu
  const lastDay = new Date(year, month + 1, 0);
  const diff = (lastDay.getDay() - dayOfWeek + 7) % 7;
  return new Date(year, month + 1, -diff);
}

export function getLastThursday(year: number, month: number): Date {
  return getLastDayOfWeek(year, month, 4);
}

/** Returns the Sunday on or after the given date. */
function getSundayOnOrAfter(date: Date): Date {
  const d = new Date(date);
  const diff = (7 - d.getDay()) % 7; // 0=Sun
  d.setDate(d.getDate() + diff);
  return d;
}

/** Returns the last Sunday on or before the given date. */
function getLastSundayOnOrBefore(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/**
 * Legacy helper retained for compatibility: the last Sunday on or before the
 * last Thursday of the month.
 */
export function getCutoffSunday(year: number, month: number): Date {
  return getLastSundayOnOrBefore(getLastThursday(year, month));
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
    startDate = new Date(latestEndDate);
    startDate.setDate(startDate.getDate() + 1);
  } else {
    // No previous period — start from the beginning of the current month.
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Cutoff is always a Sunday: whole weeks from the start date, and if the
  // start date is not a Monday we still land the cutoff on a Sunday.
  let endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + cycleWeeks * 7 - 1);
  endDate = getSundayOnOrAfter(endDate);

  // Pay date = last Thursday of the cutoff month.
  const payDate = getLastThursday(endDate.getFullYear(), endDate.getMonth());

  // Inclusive day count
  const days =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
  const periodWeeks = Math.round((days / 7) * 10) / 10;

  const periodName = `${MONTH_NAMES[endDate.getMonth()]} ${endDate.getFullYear()}`;

  return {
    periodName,
    startDate: toDateStr(startDate),
    endDate: toDateStr(endDate),
    payDate: toDateStr(payDate),
    periodWeeks,
  };
}

