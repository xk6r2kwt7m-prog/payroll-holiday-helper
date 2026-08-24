/**
 * Responsible deletion of a DRAFT payroll period.
 *
 * Deleting a payroll period is only safe when every record derived from it is
 * removed with it. The dangerous case is the holiday ledger: holiday payments
 * recorded inside a period write `holiday_taken` rows into `holiday_ledger`
 * with `source_table = 'holiday_payments'`. If the payments are deleted while
 * those ledger rows survive, balances stay wrong forever (orphan ledger rows).
 *
 * This module builds a read-only impact report so the admin sees exactly what
 * will be removed BEFORE anything is deleted, and provides the canonical
 * ordering used by the delete mutation.
 */

export interface PeriodDeleteImpact {
  periodId: string;
  periodName: string;
  status: string;
  /** Payroll entries (employee rows) inside the period. */
  entryCount: number;
  /** Holiday payments recorded against the period. */
  holidayPaymentCount: number;
  holidayPaymentHours: number;
  /** Ledger rows created by those holiday payments (holiday taken). */
  ledgerFromPaymentsCount: number;
  ledgerFromPaymentsHours: number;
  /** Accrual ledger rows created by the period's payroll entries. */
  ledgerFromEntriesCount: number;
  ledgerFromEntriesHours: number;
  /** Internal period notes that will be removed with the period. */
  noteCount: number;
  /** Location splits attached to the period's entries. */
  locationSplitCount: number;
}

export interface DeleteBlock {
  code: "not_draft" | "no_period";
  message: string;
}

/** A period may only be deleted while it is a draft (never once approved). */
export function getPeriodDeleteBlock(
  period: { status?: string | null } | null | undefined,
): DeleteBlock | null {
  if (!period) return { code: "no_period", message: "No payroll period selected." };
  const status = String(period.status ?? "").trim().toLowerCase();
  if (status !== "draft") {
    return {
      code: "not_draft",
      message:
        "Only draft periods can be deleted. Reopen the period first — approved payroll is locked for compliance.",
    };
  }
  return null;
}

/**
 * Plain-English list of what deletion will remove, in the order it happens.
 * Used by the confirmation dialog and written to the audit log.
 */
export function describeDeleteImpact(impact: PeriodDeleteImpact): string[] {
  const lines: string[] = [];
  lines.push(`${impact.entryCount} payroll entr${impact.entryCount === 1 ? "y" : "ies"} (hours, rates, bonuses, adjustment notes)`);
  if (impact.holidayPaymentCount > 0) {
    lines.push(
      `${impact.holidayPaymentCount} holiday payment${impact.holidayPaymentCount === 1 ? "" : "s"} totalling ${impact.holidayPaymentHours.toFixed(2)}h paid in this period`,
    );
  }
  if (impact.ledgerFromPaymentsCount > 0) {
    lines.push(
      `${impact.ledgerFromPaymentsCount} holiday ledger "taken" row${impact.ledgerFromPaymentsCount === 1 ? "" : "s"} (${impact.ledgerFromPaymentsHours.toFixed(2)}h) — reversed so balances return to their pre-period value`,
    );
  }
  if (impact.ledgerFromEntriesCount > 0) {
    lines.push(
      `${impact.ledgerFromEntriesCount} holiday accrual ledger row${impact.ledgerFromEntriesCount === 1 ? "" : "s"} (${impact.ledgerFromEntriesHours.toFixed(2)}h) created from this period's hours`,
    );
  }
  if (impact.locationSplitCount > 0) {
    lines.push(`${impact.locationSplitCount} location hour split${impact.locationSplitCount === 1 ? "" : "s"}`);
  }
  if (impact.noteCount > 0) {
    lines.push(`${impact.noteCount} internal period note${impact.noteCount === 1 ? "" : "s"}`);
  }
  return lines;
}

/** What deletion never touches — shown so the admin knows the blast radius. */
export const DELETE_PRESERVED_ITEMS: string[] = [
  "Timesheets and clock-in records (the source evidence stays intact)",
  "Approved payroll periods and their ledger entries",
  "Employee records, contracts and employment terms",
  "Approved holiday requests and their ledger history from other periods",
  "Timesheet name links (aliases) — a re-import will match the same people",
  "The audit log — the deletion itself is recorded permanently",
];

export const DELETE_CONFIRM_WORD = "DELETE";

export function isDeleteConfirmed(typed: string, reason: string): boolean {
  return typed.trim().toUpperCase() === DELETE_CONFIRM_WORD && reason.trim().length >= 10;
}
