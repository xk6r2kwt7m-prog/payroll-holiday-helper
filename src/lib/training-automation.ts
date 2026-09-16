/**
 * Training automation — pure helpers, no DB access.
 *
 * Rules that must not be broken:
 *  - The version of a document an employee completed is never changed.
 *  - A new version never resends itself: a manager decides what happens.
 *  - Nothing here decides anything legal; it only surfaces who is affected.
 */

export const INDUCTION_REMINDER_DAYS = [3, 7, 14] as const;
export const INDUCTION_REMINDER_WEEKLY_AFTER = 14;

export interface InductionPackLike {
  id: string;
  employee_id: string;
  status?: string | null;
  sent_at?: string | null;
  opened_at?: string | null;
  completed_at?: string | null;
  reminder_sent_at?: string | null;
  reminder_count?: number | null;
  token_expires_at?: string | null;
  is_test_send?: boolean | null;
}

function daysBetween(from: string | Date, to: Date): number {
  const start = typeof from === "string" ? new Date(from) : from;
  return Math.floor((to.getTime() - start.getTime()) / 86_400_000);
}

/** True when this unfinished induction is due a reminder now. */
export function inductionReminderDue(pack: InductionPackLike, now = new Date()): boolean {
  if (pack.is_test_send) return false;
  if (pack.completed_at) return false;
  if (!pack.sent_at) return false;
  if (pack.token_expires_at && new Date(pack.token_expires_at).getTime() < now.getTime()) return false;

  const sinceSent = daysBetween(pack.sent_at, now);
  if (sinceSent < INDUCTION_REMINDER_DAYS[0]) return false;

  // One reminder per scheduled point: never two on the same day.
  if (pack.reminder_sent_at && daysBetween(pack.reminder_sent_at, now) < 1) return false;

  if ((INDUCTION_REMINDER_DAYS as readonly number[]).includes(sinceSent)) return true;
  if (sinceSent > INDUCTION_REMINDER_WEEKLY_AFTER) {
    return (sinceSent - INDUCTION_REMINDER_WEEKLY_AFTER) % 7 === 0;
  }
  return false;
}

export type InductionStage = "not_opened" | "in_progress" | "completed";

export function inductionStage(pack: InductionPackLike): InductionStage {
  if (pack.completed_at) return "completed";
  return pack.opened_at ? "in_progress" : "not_opened";
}

export function inductionStageLabel(stage: InductionStage): string {
  switch (stage) {
    case "completed": return "Completed";
    case "in_progress": return "Started, not finished";
    default: return "Not opened yet";
  }
}

/** Unfinished, non-test inductions, oldest first. */
export function unfinishedInductions(
  packs: InductionPackLike[],
  now = new Date()
): (InductionPackLike & { days_outstanding: number; stage: InductionStage })[] {
  return packs
    .filter((p) => !p.completed_at && !p.is_test_send && p.sent_at)
    .map((p) => ({
      ...p,
      days_outstanding: Math.max(0, daysBetween(p.sent_at!, now)),
      stage: inductionStage(p),
    }))
    .sort((a, b) => b.days_outstanding - a.days_outstanding);
}

// ── New document versions ────────────────────────────────────────────────────

export type ChangeSignificance = "minor" | "significant";
export type ReissueDecision = "pending" | "no_action" | "acknowledge" | "retrain";

/**
 * Suggests how big a version change is. A replaced file is treated as
 * significant; wording-only detail changes are treated as minor.
 * The manager always makes the final choice.
 */
export function suggestSignificance(input: {
  fileReplaced?: boolean;
  changedFields?: string[];
}): ChangeSignificance {
  if (input.fileReplaced) return "significant";
  const meaningful = (input.changedFields ?? []).filter(
    (f) => !["owner_name", "owner_job_title", "reference_number", "review_date", "description"].includes(f)
  );
  return meaningful.length > 0 ? "significant" : "minor";
}

export interface CompletedItemLike {
  document_id?: string | null;
  document_version?: number | null;
  acknowledged_at?: string | null;
  pack?: { employee_id?: string | null; completed_at?: string | null; is_test_send?: boolean | null } | null;
}

/**
 * Staff who completed the previous version of a document.
 * The stored version on their record is read only — never rewritten.
 */
export function staffWhoCompletedPreviousVersion(
  items: CompletedItemLike[],
  documentId: string,
  previousVersion?: number | null
): string[] {
  const ids = new Set<string>();
  items.forEach((i) => {
    if (i.document_id !== documentId) return;
    if (!i.acknowledged_at) return;
    if (i.pack?.is_test_send) return;
    if (!i.pack?.completed_at) return;
    if (previousVersion != null && i.document_version != null && i.document_version !== previousVersion) return;
    const employee = i.pack?.employee_id;
    if (employee) ids.add(employee);
  });
  return [...ids];
}

export function reissueDecisionLabel(decision: ReissueDecision): string {
  switch (decision) {
    case "retrain": return "Full retraining sent";
    case "acknowledge": return "Asked to read and acknowledge";
    case "no_action": return "No action needed";
    default: return "Waiting for your decision";
  }
}

export function reissueDecisionTone(decision: ReissueDecision): "amber" | "green" | "grey" {
  if (decision === "pending") return "amber";
  if (decision === "no_action") return "grey";
  return "green";
}

/** A new version never reaches staff on its own. */
export function reissueRequiresManagerDecision(decision: ReissueDecision): boolean {
  return decision === "pending";
}

// ── Automatic induction for new starters ─────────────────────────────────────

export interface CompliancePreferences {
  auto_assign_induction?: boolean;
  auto_assign_after_days?: number;
}

export function shouldAutoAssignInduction(prefs?: CompliancePreferences | null): boolean {
  return prefs?.auto_assign_induction === true;
}

export interface StarterLike {
  id: string;
  status?: string | null;
  archived_at?: string | null;
  email?: string | null;
  is_test_record?: boolean | null;
  created_at?: string | null;
}

/** New starters who have no induction pack yet and can be emailed. */
export function startersNeedingInduction(
  employees: StarterLike[],
  packsByEmployee: Set<string>
): StarterLike[] {
  return employees.filter(
    (e) =>
      !e.archived_at &&
      !e.is_test_record &&
      e.status !== "leaver" &&
      !!e.email &&
      !packsByEmployee.has(e.id)
  );
}
