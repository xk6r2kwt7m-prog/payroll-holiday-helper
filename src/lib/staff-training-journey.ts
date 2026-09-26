import { differenceInCalendarDays, parseISO } from "date-fns";
import type { TrainingAssignment } from "@/hooks/useTrainingLibrary";

export type StaffTrainingStatus = "overdue" | "due_now" | "in_progress" | "awaiting_signoff" | "not_started" | "completed" | "failed";

/** Read-only presentation. An acknowledgement is not a substitute for a quiz or sign-off. */
export function getStaffTrainingStatus(a: TrainingAssignment, now = new Date()): StaffTrainingStatus {
  const doc = a.training_library;
  const quizMissing = !!doc?.requires_quiz && a.quiz_passed !== true;
  const ackMissing = !!doc?.requires_acknowledgement && !a.acknowledged_at;
  const signoffMissing = a.signoff_required && !a.signed_off_at;
  const completionMissing = !!doc?.requires_completion && !a.completed_at;
  if (["completed", "acknowledged"].includes(a.status) && !quizMissing && !ackMissing && !signoffMissing && !completionMissing) return "completed";
  if (quizMissing && a.quiz_passed === false && a.quiz_score != null) return "failed";
  if (signoffMissing && !quizMissing && !ackMissing && !!a.viewed_at) return "awaiting_signoff";
  const days = a.due_date ? differenceInCalendarDays(parseISO(a.due_date), now) : null;
  if (days !== null && days < 0) return "overdue";
  if (a.status === "viewed" || a.viewed_at) return "in_progress";
  if (days !== null && days <= 7) return "due_now";
  return "not_started";
}

/** Only assigned, published work. Order by overdue, deadline, then mandatory status. */
export function staffTrainingJourney(assignments: readonly TrainingAssignment[], now = new Date()) {
  const visible = assignments.filter(a => a.status !== "cancelled" && a.training_library?.status === "published");
  const completed = visible.filter(a => getStaffTrainingStatus(a, now) === "completed");
  const waiting = visible.filter(a => getStaffTrainingStatus(a, now) === "awaiting_signoff");
  const actionable = visible.filter(a => !["completed", "awaiting_signoff"].includes(getStaffTrainingStatus(a, now)))
    .sort((a, b) => {
      const dateA = a.due_date ? parseISO(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? parseISO(b.due_date).getTime() : Infinity;
      const safeA = Number.isNaN(dateA) ? Infinity : dateA;
      const safeB = Number.isNaN(dateB) ? Infinity : dateB;
      return (safeA === safeB ? 0 : safeA - safeB) || Number(b.is_mandatory) - Number(a.is_mandatory) || a.id.localeCompare(b.id);
    });
  return { visible, completed, waiting, actionable, next: actionable[0] ?? null,
    percent: visible.length ? Math.round(completed.length / visible.length * 100) : 0 };
}

/** Passing an assessment must not bypass a separate acknowledgement or practical check. */
export function quizCanCompleteAssignment(a: Pick<TrainingAssignment, "signoff_required" | "signed_off_at" | "acknowledged_at" | "training_library">): boolean {
  return (!a.signoff_required || !!a.signed_off_at)
    && (!a.training_library?.requires_acknowledgement || !!a.acknowledged_at);
}
