/**
 * Centralised display strings + pure helpers for separating holiday
 * ACCRUAL (period-level, informational, not yet paid) from actual
 * holiday PAYMENTS (real money paid out through payroll or leaver
 * settlement).
 *
 * This file is UI-facing and adds NO logic to accrual, ledger, payroll,
 * NMW, service charge, or approval workflows. It only supplies labels
 * and a pure candidate-picker for the leaver settlement banner.
 */

export const HOLIDAY_DISPLAY_LABELS = {
  /** Actual holiday payments recorded against a payroll period. */
  actualHolidayPay: "Actual holiday payments",
  actualHolidayPaySubtitle:
    "Real holiday paid, taken, or settled — from holiday payment records. Accrued hours in the payroll table are separate and not yet paid.",
  actualHolidayEmpty: "No holiday payments in this period yet.",
  accrualColumn: "Holiday Accrued",
  accrualColumnTooltip:
    "Hours accrued during this payroll period. This is NOT a holiday payment — it becomes a ledger entry only when the payroll period is approved.",
  accrualRowSuffix: "Accrued this period — not paid yet.",
  notPaidYet: "Not paid yet",
  pendingApproval: "Pending payroll approval",
  leaverSettlementCta: "Use Settle Leaver to pay final holiday.",
  remainingBalance: "Remaining balance",
  leaverSettlement: "Leaver settlement",
} as const;

export interface LeaverSettlementInput {
  employeeId: string;
  employeeName: string;
  endDate: string; // ISO
  hourlyRate: number;
  /** Sum of payroll_entries.holiday_accrued_hours for the leave year. */
  accruedHoursYear: number;
  /** Sum of holiday_ledger.hours where entry_type='carry_over_in' for the leave year. */
  carryOverHours: number;
  /** Sum of holiday_payments.hours for the leave year. */
  takenHoursYear: number;
  /** Whether a payout_on_termination row already exists for this employee (any year). */
  hasSettlementLedger: boolean;
}

export interface LeaverSettlementCandidate {
  employeeId: string;
  employeeName: string;
  endDate: string;
  remainingHours: number;
  estimatedValue: number;
  hourlyRate: number;
}

/**
 * Pure: decide whether a leaver has an unsettled remaining holiday
 * balance and should be nudged toward Settle Leaver.
 *
 * Returns null when the leaver has zero (or negative) remaining balance
 * OR already has a payout_on_termination ledger row.
 */
export function pickLeaverSettlementCandidate(
  input: LeaverSettlementInput,
  tolerance = 0.01,
): LeaverSettlementCandidate | null {
  if (input.hasSettlementLedger) return null;
  const remaining =
    Number(input.accruedHoursYear || 0) +
    Number(input.carryOverHours || 0) -
    Number(input.takenHoursYear || 0);
  if (!(remaining > tolerance)) return null;
  const rounded = Math.round(remaining * 100) / 100;
  const estimated = Math.round(rounded * Number(input.hourlyRate || 0) * 100) / 100;
  return {
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    endDate: input.endDate,
    remainingHours: rounded,
    estimatedValue: estimated,
    hourlyRate: Number(input.hourlyRate || 0),
  };
}

/**
 * Pure: total payable holiday cost for a payroll period must be the
 * sum of actual holiday_payments rows only, never accrual. Kept as a
 * tiny helper so tests can lock the invariant.
 */
export function sumActualHolidayPayments(
  payments: Array<{ total: number | string | null | undefined }>,
): number {
  return (
    Math.round(
      payments.reduce((s, p) => s + Number(p.total || 0), 0) * 100,
    ) / 100
  );
}
