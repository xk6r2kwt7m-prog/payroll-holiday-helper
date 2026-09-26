import { londonDateKey } from "./training-reminder-policy.ts";

export interface ReminderPack {
  id?: string; employee_id?: string;
  is_test_send?: boolean | null; completed_at?: string | null; sent_at?: string | null;
  reminder_sent_at?: string | null; token_expires_at?: string | null; status?: string | null;
}
/** Catch up once to the latest elapsed milestone, never send each missed reminder. */
export function inductionReminderDue(pack: ReminderPack, now = new Date()): boolean {
  if (pack.is_test_send || pack.completed_at || !pack.sent_at || ["cancelled", "revoked", "expired", "draft"].includes(pack.status ?? "")) return false;
  const sent = new Date(pack.sent_at);
  if (!Number.isFinite(sent.getTime()) || sent > now) return false;
  if (pack.token_expires_at) {
    const expiry = Date.parse(pack.token_expires_at);
    if (!Number.isFinite(expiry) || expiry <= now.getTime()) return false;
  }
  const day = (date: Date) => Date.parse(londonDateKey(date)) / 86_400_000;
  const elapsed = day(now) - day(sent);
  const milestone = elapsed >= 14 ? 14 + Math.floor((elapsed - 14) / 7) * 7 : elapsed >= 7 ? 7 : elapsed >= 3 ? 3 : null;
  if (milestone === null) return false;
  if (!pack.reminder_sent_at) return true;
  const last = new Date(pack.reminder_sent_at);
  if (!Number.isFinite(last.getTime()) || last > now) return false;
  return day(last) < day(now) && day(last) - day(sent) < milestone;
}
