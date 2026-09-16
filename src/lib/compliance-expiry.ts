/**
 * Certificate and licence expiry bands + reminder logic.
 * Pure functions — reminders fire at 90, 60, 30 days and on the expiry date.
 */

export type ExpiryBand = "expired" | "30_days" | "60_days" | "90_days" | "ok" | "none";
export type ComplianceTone = "green" | "amber" | "red" | "grey";

export const REMINDER_DAYS = [90, 60, 30, 0] as const;

export function daysUntil(dateStr?: string | null, today = new Date()): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export function resolveExpiryBand(dateStr?: string | null, today = new Date()): ExpiryBand {
  const days = daysUntil(dateStr, today);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 30) return "30_days";
  if (days <= 60) return "60_days";
  if (days <= 90) return "90_days";
  return "ok";
}

export function expiryTone(band: ExpiryBand): ComplianceTone {
  switch (band) {
    case "expired":
      return "red";
    case "30_days":
    case "60_days":
      return "amber";
    case "90_days":
      return "amber";
    case "ok":
      return "green";
    default:
      return "grey";
  }
}

export function expiryLabel(dateStr?: string | null, today = new Date()): string {
  const days = daysUntil(dateStr, today);
  if (days === null) return "No expiry date";
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

/**
 * Which reminder threshold, if any, should fire today for this expiry date.
 * Returns null when today is not a reminder day.
 */
export function reminderDueToday(
  dateStr?: string | null,
  today = new Date()
): (typeof REMINDER_DAYS)[number] | null {
  const days = daysUntil(dateStr, today);
  if (days === null) return null;
  return (REMINDER_DAYS as readonly number[]).includes(days)
    ? (days as (typeof REMINDER_DAYS)[number])
    : null;
}
