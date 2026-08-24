/**
 * Two-hour reversal window for deleted DRAFT payroll periods.
 *
 * Deleting a draft period first captures a complete snapshot (period, entries,
 * location splits, holiday payments, derived holiday ledger rows and internal
 * notes) into the audit log. Within the window the admin can restore the exact
 * same records — same ids — so balances and reports return to their prior state.
 */

export const RESTORE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export const DELETE_OPERATION = "delete_draft_period";
export const RESTORE_OPERATION = "restore_draft_period";

export interface PeriodSnapshot {
  period: Record<string, any>;
  entries: Record<string, any>[];
  entryLocations: Record<string, any>[];
  holidayPayments: Record<string, any>[];
  holidayLedger: Record<string, any>[];
  notes: Record<string, any>[];
}

export interface RestorableDeletion {
  auditId: string;
  periodId: string;
  periodName: string;
  deletedAt: string;
  reason: string | null;
  entryCount: number;
  expiresAt: string;
  snapshot: PeriodSnapshot | null;
}

export function restoreExpiryFrom(deletedAt: string | Date): Date {
  const base = typeof deletedAt === "string" ? new Date(deletedAt) : deletedAt;
  return new Date(base.getTime() + RESTORE_WINDOW_MS);
}

export function isRestorable(deletedAt: string | Date, now: Date = new Date()): boolean {
  return restoreExpiryFrom(deletedAt).getTime() > now.getTime();
}

/** "1h 42m left" / "12m left" / "expired" */
export function formatRestoreRemaining(deletedAt: string | Date, now: Date = new Date()): string {
  const ms = restoreExpiryFrom(deletedAt).getTime() - now.getTime();
  if (ms <= 0) return "expired";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m left` : `${Math.max(minutes, 1)}m left`;
}

export function isSnapshotRestorable(snapshot: PeriodSnapshot | null | undefined): boolean {
  return !!snapshot?.period?.id;
}
