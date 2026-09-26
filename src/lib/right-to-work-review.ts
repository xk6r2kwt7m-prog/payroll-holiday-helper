import { londonDateKey } from "../../supabase/functions/_shared/training-reminder-policy";

/** Display/readiness only. Never changes the stored review or employment record. */
export function effectiveRtwStatus(status?: string | null, expiresOn?: string | null, today = londonDateKey(new Date())): string {
  if (status !== "verified" || !expiresOn) return status ?? "not_submitted";
  const parsed = new Date(expiresOn);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== expiresOn) return "pending_review";
  return expiresOn < today ? "expired" : "verified";
}
