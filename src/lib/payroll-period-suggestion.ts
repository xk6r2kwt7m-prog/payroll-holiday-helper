/**
 * Auto-suggest next payroll period dates based on hospitality cutoff rules:
 * - pay date  = last Thursday of the payroll month
 * - cutoff    = last Sunday ON OR BEFORE that pay date
 * - start     = previous cutoff + 1 day
 * - weeks     = inclusive day count / 7
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

/**
 * Returns the last Sunday on or before the given date.
 */
function getLastSundayOnOrBefore(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun … 6=Sat
  d.setDate(d.getDate() - dayOfWeek);
  return d;
}

/**
 * Cutoff = last Sunday on or before last Thursday of the month.
 * This guarantees the cutoff never falls after the pay date.
 */
export function getCutoffSunday(year: number, month: number): Date {
  const payDate = getLastThursday(year, month);
  return getLastSundayOnOrBefore(payDate);
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

export function suggestNextPeriod(
  latestEndDate?: string | null
): SuggestedPeriod {
  let startDate: Date;

  if (latestEndDate) {
    // Next period starts the day after the previous cutoff
    startDate = new Date(latestEndDate);
    startDate.setDate(startDate.getDate() + 1);
  } else {
    // No previous period — start from beginning of current month
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Target month is the month the start date falls into
  let targetMonth = startDate.getMonth();
  let targetYear = startDate.getFullYear();

  // End date = cutoff Sunday (last Sunday on or before last Thursday)
  let endDate = getCutoffSunday(targetYear, targetMonth);

  // If cutoff is before startDate, move to next month
  if (endDate <= startDate) {
    const nextMonth = targetMonth + 1;
    targetYear = nextMonth > 11 ? targetYear + 1 : targetYear;
    targetMonth = nextMonth % 12;
    endDate = getCutoffSunday(targetYear, targetMonth);
  }

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
