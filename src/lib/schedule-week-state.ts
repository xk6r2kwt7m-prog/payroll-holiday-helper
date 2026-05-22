/**
 * Pure helper: derive a single visible "week state" for the schedule header.
 *
 * No React / Supabase / React Query imports.
 */

export type ScheduleWeekState =
  | "not_started"
  | "draft"
  | "ready_to_publish"
  | "needs_attention"
  | "published";

export interface WeekStateInput {
  shifts: Array<{
    id?: string;
    employee_id?: string | null;
    is_published?: boolean | null;
  }>;
  criticalWarningCount: number;
  unassignedRequiredCount?: number;
}

export interface WeekStateResult {
  state: ScheduleWeekState;
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
}

const LABELS: Record<ScheduleWeekState, { label: string; tone: WeekStateResult["tone"] }> = {
  not_started: { label: "Not started", tone: "neutral" },
  draft: { label: "Draft", tone: "info" },
  ready_to_publish: { label: "Ready to publish", tone: "success" },
  needs_attention: { label: "Needs attention", tone: "warning" },
  published: { label: "Published", tone: "success" },
};

export function getScheduleWeekState(input: WeekStateInput): WeekStateResult {
  const { shifts, criticalWarningCount, unassignedRequiredCount = 0 } = input;

  if (!shifts || shifts.length === 0) {
    return { state: "not_started", ...LABELS.not_started };
  }

  const total = shifts.length;
  const publishedCount = shifts.filter((s) => s.is_published).length;
  const allPublished = publishedCount === total;

  if (allPublished) {
    return { state: "published", ...LABELS.published };
  }

  const hasCritical = criticalWarningCount > 0 || unassignedRequiredCount > 0;
  if (hasCritical) {
    return { state: "needs_attention", ...LABELS.needs_attention };
  }

  // Has shifts, none/some published, no critical issues
  // "ready_to_publish" only when nothing has been published yet AND every shift is assigned
  const noneUnassigned = shifts.every((s) => !!s.employee_id);
  if (publishedCount === 0 && noneUnassigned) {
    return { state: "ready_to_publish", ...LABELS.ready_to_publish };
  }

  return { state: "draft", ...LABELS.draft };
}
