/** Reminder timing only; due dates are manager-set, never inferred legal deadlines. */
export function londonDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function trainingReminderDecision(a: {
  status: string; due_date: string | null; viewed_at?: string | null;
  acknowledged_at?: string | null; quiz_passed?: boolean | null;
  signoff_required?: boolean; signed_off_at?: string | null;
  training_library?: { status?: string; requires_quiz?: boolean; requires_acknowledgement?: boolean } | null;
  employees?: { status?: string; archived_at?: string | null; end_date?: string | null; is_test_record?: boolean } | null;
}, today: string): { daysUntil: number; managerOnly: boolean } | null {
  if (!a.due_date || !/^\d{4}-\d{2}-\d{2}$/.test(a.due_date)) return null;
  if (!["assigned", "viewed", "in_progress", "acknowledged"].includes(a.status)) return null;
  if (a.training_library?.status !== "published" || !a.employees || a.employees.is_test_record || a.employees.archived_at) return null;
  if (a.employees.end_date && a.employees.end_date < today) return null;
  if (a.employees.status === "leaver" && !a.employees.end_date) return null;
  const daysUntil = Math.round((Date.parse(a.due_date) - Date.parse(today)) / 86_400_000);
  if (!Number.isFinite(daysUntil)) return null;
  // One week before, tomorrow, on the day, then 1/3/7 days overdue and weekly.
  if (![7, 1, 0, -1, -3, -7].includes(daysUntil) && !(daysUntil < -7 && daysUntil % 7 === 0)) return null;
  const quizDone = !a.training_library.requires_quiz || a.quiz_passed === true;
  const ackDone = !a.training_library.requires_acknowledgement || !!a.acknowledged_at;
  const managerOnly = !!a.signoff_required && !a.signed_off_at && !!a.viewed_at && quizDone && ackDone;
  if (a.status === "acknowledged" && quizDone && ackDone && (!a.signoff_required || a.signed_off_at)) return null;
  return { daysUntil, managerOnly };
}
