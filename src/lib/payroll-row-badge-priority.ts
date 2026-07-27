/**
 * Payroll row badge prioritization and cap.
 *
 * Pure helpers. No React / Supabase / side effects.
 *
 * Rules (see product spec — Payroll List Clutter Cleanup):
 *  - Each employee row shows at most 2 inline badges (1 primary warning +
 *    1 secondary informational). Any remaining badges collapse into a
 *    "+N more" chip that a Popover expands.
 *  - Priority (highest first):
 *      1. NMW fail / NMW at risk
 *      2. Missing timesheet
 *      3. Review changes
 *      4. Holiday pay
 *      5. Starter (calendar-month rule below)
 *      6. Payroll-relevant observation
 *      (then, overflow-only:) rate change, SC change, manual adjustment,
 *      zero hours, internal note, leaver, prior adjustment, imported-hours
 *      adjustment.
 *  - Starter badge is NOT period-scoped — it is calendar-month scoped:
 *    show only while the payroll period's reference date falls inside the
 *    same calendar month as the employee's start_date. Example: started
 *    8 July → visible on any payroll period covering July; hidden from
 *    August onwards.
 */

export type BadgeTone =
  | "destructive"
  | "warning"
  | "primary"
  | "accent"
  | "muted";

export interface RowBadge {
  key: string;
  label: string;
  tone: BadgeTone;
  /** Lower number = higher priority. */
  priority: number;
  /** Optional click handler for interactive badges (e.g. Review changes). */
  onClick?: () => void;
  /** Optional icon key (rendered by the caller). */
  icon?: "git-compare" | "alert" | "history";
  testId?: string;
  title?: string;
}

export const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  destructive: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  primary: "bg-primary/10 text-primary border-primary/20",
  accent: "bg-accent/15 text-accent-foreground border-border",
  muted: "bg-muted text-muted-foreground border-border",
};

/**
 * True when `periodReference` (any date within the payroll period, e.g. its
 * end date) falls inside the same calendar month/year as `startDate`.
 * If either is missing or invalid, returns false.
 */
export function isStarterCalendarMonth(
  startDate: string | null | undefined,
  periodReference: string | null | undefined,
): boolean {
  if (!startDate || !periodReference) return false;
  const s = new Date(startDate);
  const p = new Date(periodReference);
  if (Number.isNaN(s.getTime()) || Number.isNaN(p.getTime())) return false;
  return s.getFullYear() === p.getFullYear() && s.getMonth() === p.getMonth();
}

/** Max visible inline badges before the "+N more" overflow kicks in. */
export const MAX_VISIBLE_ROW_BADGES = 2;

/**
 * Split a badge list into the visible slice and the overflow slice
 * according to priority. Stable ordering by (priority, key).
 */
export function prioritizeRowBadges(
  badges: RowBadge[],
  max: number = MAX_VISIBLE_ROW_BADGES,
): { visible: RowBadge[]; overflow: RowBadge[] } {
  const sorted = [...badges].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.key.localeCompare(b.key);
  });
  return {
    visible: sorted.slice(0, max),
    overflow: sorted.slice(max),
  };
}

/** Numeric priority for each named badge kind. Lower = shown first. */
export const BADGE_PRIORITY = {
  nmw_fail: 10,
  nmw_risk: 15,
  missing_timesheet: 20,
  review_changes: 30,
  holiday_pay: 40,
  starter: 50,
  payroll_observation: 60,
  leaver: 65,
  rate_changed: 70,
  sc_changed: 71,
  manual_adjustment: 80,
  imported_hours_adjusted: 81,
  prior_adjustment: 82,
  zero_hours: 90,
  internal_note: 100,
} as const;
