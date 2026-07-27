/**
 * Pure helpers for People dashboard lifecycle display.
 *
 * Rules:
 * - "Starter" = employed AND start_date within the recent-starter window
 *   (default: last 30 days, inclusive of today). Raw `status='starter'` alone
 *   does NOT make someone a current starter.
 * - "Active/current employee" = start_date <= today (or unknown), no end_date
 *   before today, not archived, not marked as leaver.
 * - "Former" = end_date before today OR archived OR status='leaver'.
 * - "Onboarding" = status='onboarding' AND not former.
 * - "Incomplete onboarding" needing attention = current starter or onboarding
 *   status, and not former/archived.
 *
 * No React, Supabase, or React Query imports. No mutations.
 */

export interface LifecycleEmployee {
  id: string;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  archived_at?: string | null;
}

export const DEFAULT_STARTER_WINDOW_DAYS = 30;

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function isFormerEmployee(emp: LifecycleEmployee, today: Date): boolean {
  if (emp.archived_at) return true;
  if (emp.status === "leaver") {
    const end = toDate(emp.end_date);
    // Leaver flagged: treat as former once end_date has passed, or immediately if no end date
    if (!end) return true;
    return startOfDay(end) < startOfDay(today);
  }
  const end = toDate(emp.end_date);
  if (end && startOfDay(end) < startOfDay(today)) return true;
  return false;
}

export function isCurrentEmployee(emp: LifecycleEmployee, today: Date): boolean {
  if (isFormerEmployee(emp, today)) return false;
  const start = toDate(emp.start_date);
  if (start && startOfDay(start) > startOfDay(today)) return false; // hasn't started yet
  return true;
}

export interface StarterWindow {
  windowDays?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
}

export function isCurrentStarter(
  emp: LifecycleEmployee,
  today: Date,
  window: StarterWindow = {},
): boolean {
  if (isFormerEmployee(emp, today)) return false;
  const start = toDate(emp.start_date);
  if (!start) return false; // no start date = cannot claim starter
  const startDay = startOfDay(start);
  const todayDay = startOfDay(today);
  if (startDay > todayDay) return false; // future starter, not current

  // Prefer explicit payroll period if provided
  const periodStart = toDate(window.periodStart);
  const periodEnd = toDate(window.periodEnd);
  if (periodStart && periodEnd) {
    return startDay >= startOfDay(periodStart) && startDay <= startOfDay(periodEnd);
  }

  const days = window.windowDays ?? DEFAULT_STARTER_WINDOW_DAYS;
  const cutoff = new Date(todayDay);
  cutoff.setDate(cutoff.getDate() - days);
  return startDay >= startOfDay(cutoff);
}

export function isRelevantForOnboardingAttention(
  emp: LifecycleEmployee,
  today: Date,
  window: StarterWindow = {},
): boolean {
  if (isFormerEmployee(emp, today)) return false;
  if ((emp.status as string) === "onboarding") return true;
  if (isCurrentStarter(emp, today, window)) return true;
  // Upcoming starter (start_date in the future) = relevant
  const start = toDate(emp.start_date);
  if (start && startOfDay(start) > startOfDay(today)) return true;
  return false;
}

export interface PeopleDashboardCounts {
  active: number;
  starters: number;
  onboarding: number;
  incompleteOnboarding: number;
  former: number;
}

export function getPeopleDashboardCounts(
  employees: LifecycleEmployee[],
  today: Date,
  window: StarterWindow = {},
): PeopleDashboardCounts {
  let active = 0;
  let starters = 0;
  let onboarding = 0;
  let incompleteOnboarding = 0;
  let former = 0;

  for (const emp of employees) {
    if (isFormerEmployee(emp, today)) {
      former++;
      continue;
    }
    if (isCurrentEmployee(emp, today)) active++;
    if (isCurrentStarter(emp, today, window)) starters++;
    if ((emp.status as string) === "onboarding") onboarding++;
    if (isRelevantForOnboardingAttention(emp, today, window)) incompleteOnboarding++;
  }

  return { active, starters, onboarding, incompleteOnboarding, former };
}
