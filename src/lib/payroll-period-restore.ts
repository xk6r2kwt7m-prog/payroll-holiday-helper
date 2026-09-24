/**
 * Two-hour reversal window for deleted DRAFT payroll periods.
 *
 * Everything happens in the database, in one transaction each way:
 *  - delete_draft_payroll_period   snapshots every linked record into a private
 *    recovery table (app users can never read or write it), then removes them.
 *  - restore_draft_payroll_period  puts the exact same rows back (same ids) and
 *    refuses if anything would come out different.
 *  - list_restorable_payroll_deletions  returns summary details only.
 *
 * The browser never builds, reads or re-inserts a snapshot, and there is no
 * step-by-step fallback.
 */

export const RESTORE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export const DELETE_RPC = "delete_draft_payroll_period" as const;
export const RESTORE_RPC = "restore_draft_payroll_period" as const;
export const LIST_RESTORABLE_RPC = "list_restorable_payroll_deletions" as const;

/** Audit-log operation names written by the database functions. */
export const DELETE_OPERATION = "delete_draft_period";
export const RESTORE_OPERATION = "restore_draft_period";

export interface RecoveryCounts {
  entries?: number;
  entryLocations?: number;
  adjustments?: number;
  nmwAudit?: number;
  notes?: number;
  holidayPayments?: number;
  holidayLedger?: number;
  overpayments?: number;
  imports?: number;
  adminNotes?: number;
}

export interface RestorableDeletion {
  recoveryId: string;
  periodId: string;
  periodName: string;
  deletedAt: string;
  expiresAt: string;
  reason: string | null;
  entryCount: number;
  counts: RecoveryCounts;
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

/** Maps a row from list_restorable_payroll_deletions to the banner's shape. */
export function toRestorableDeletion(row: Record<string, any>): RestorableDeletion {
  const counts = (row.counts ?? {}) as RecoveryCounts;
  return {
    recoveryId: String(row.recovery_id),
    periodId: String(row.period_id),
    periodName: String(row.period_name ?? "Payroll period"),
    deletedAt: String(row.deleted_at),
    expiresAt: String(row.restore_expires_at),
    reason: row.reason ?? null,
    entryCount: Number(counts.entries ?? 0),
    counts,
  };
}

/** Plain-English error, including when the database step is not installed yet. */
export function describeRecoveryRpcError(error: { code?: string; message?: string } | null | undefined): string {
  const message = error?.message || "";
  if (error?.code === "PGRST202" || /could not find the function/i.test(message)) {
    return "Deleting and restoring payroll periods is switched off until the database update is installed. Nothing was changed.";
  }
  return message || "The request could not be completed. Nothing was changed.";
}
