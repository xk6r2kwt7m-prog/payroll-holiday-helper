/**
 * Auto-suggest next payroll period dates based on hospitality cutoff rules:
 * - cutoff = last Sunday of the payroll month
 * - pay date = last Thursday of the payroll month
 */

function getLastDayOfWeek(year: number, month: number, dayOfWeek: number): Date {
  // dayOfWeek: 0=Sun, 4=Thu
  const lastDay = new Date(year, month + 1, 0);
  const diff = (lastDay.getDay() - dayOfWeek + 7) % 7;
  return new Date(year, month + 1, -diff);
}

export function getLastSunday(year: number, month: number): Date {
  return getLastDayOfWeek(year, month, 0);
}

export function getLastThursday(year: number, month: number): Date {
  return getLastDayOfWeek(year, month, 4);
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

  // Target month is the month the period falls into
  // Move forward to find the target month (the month where the end cutoff lands)
  const targetMonth = startDate.getMonth();
  const targetYear = startDate.getFullYear();

  // End date = last Sunday of the target month
  let endDate = getLastSunday(targetYear, targetMonth);

  // If last Sunday is before startDate, move to next month
  if (endDate <= startDate) {
    const nextMonth = targetMonth + 1;
    const nextYear = nextMonth > 11 ? targetYear + 1 : targetYear;
    const adjMonth = nextMonth % 12;
    endDate = getLastSunday(nextYear, adjMonth);
  }

  const payDate = getLastThursday(endDate.getFullYear(), endDate.getMonth());

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
