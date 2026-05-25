/**
 * Pure, deterministic helpers for the read-only Holiday Ledger Investigation
 * view. NO mutations, NO side effects.
 *
 * The hook `useHolidayYearSummary` is the runtime source of truth — these
 * helpers mirror that derivation for diagnostic display and add a set of
 * integrity checks that compare the ledger against the visible
 * `holiday_payments` rows and their linked payroll period status.
 */

export type LedgerEntryType =
  | "accrual"
  | "carry_over_in"
  | "holiday_taken"
  | "manual_adjustment"
  | "correction"
  | "payout_on_termination"
  | "carry_over_out"
  | "expiry";

export interface LedgerRow {
  id: string;
  entry_type: LedgerEntryType;
  entry_date: string;
  hours: number;
  amount: number | null;
  source_table: string | null;
  source_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface PaymentRow {
  id: string;
  payroll_period_id: string | null;
  hours: number;
  total: number;
  holiday_taken_date: string | null;
  leave_year_start: string | null;
  notes: string | null;
  created_at: string;
}

export type PeriodStatus = "draft" | "pending" | "approved" | "locked" | string;

export interface PeriodInfo {
  id: string;
  status: PeriodStatus;
  period_name?: string | null;
}

export interface LedgerSummary {
  accruedHours: number;
  carryOverHours: number;
  takenHours: number;
  /** Sum of every holiday_payments.total for the leave year (read-only). */
  paidAmount: number;
  availableHours: number;
  entries: number;
  /** Convenience: count of leaver settlement entries seen. */
  leaverSettlementCount: number;
}

export function summariseLedger(
  entries: LedgerRow[],
  payments: PaymentRow[]
): LedgerSummary {
  let accrued = 0;
  let carryOver = 0;
  let taken = 0;
  let settlement = 0;

  for (const e of entries) {
    const h = Number(e.hours);
    switch (e.entry_type) {
      case "accrual":
        accrued += h;
        break;
      case "carry_over_in":
        carryOver += h;
        break;
      case "holiday_taken":
        taken += Math.abs(h);
        break;
      case "payout_on_termination":
        taken += Math.abs(h);
        settlement += 1;
        break;
      case "carry_over_out":
      case "expiry":
        taken += Math.abs(h);
        break;
      case "manual_adjustment":
      case "correction":
        if (h >= 0) accrued += h;
        else taken += Math.abs(h);
        break;
    }
  }

  const paid = payments.reduce((s, p) => s + Number(p.total || 0), 0);

  return {
    accruedHours: accrued,
    carryOverHours: carryOver,
    takenHours: taken,
    paidAmount: paid,
    availableHours: accrued + carryOver - taken,
    entries: entries.length,
    leaverSettlementCount: settlement,
  };
}

export type IntegrityIssueCode =
  | "payment_without_ledger"
  | "ledger_without_payment"
  | "hours_mismatch"
  | "amount_mismatch"
  | "approved_period_affected";

export interface IntegrityIssue {
  code: IntegrityIssueCode;
  severity: "warning" | "error";
  message: string;
  /** Safe guidance string, never asks the user to take a mutation here. */
  guidance: string;
  paymentId?: string;
  ledgerId?: string;
  periodId?: string | null;
  periodStatus?: PeriodStatus | null;
}

const APPROVED_STATUSES: PeriodStatus[] = ["approved", "locked"];

function guidanceFor(periodStatus: PeriodStatus | null | undefined): string {
  if (periodStatus && APPROVED_STATUSES.includes(periodStatus)) {
    return "This issue affects an approved or locked payroll period. Reopen or reverse through a controlled process before correction.";
  }
  return "This issue affects a draft payroll period and can be corrected by deleting or editing the holiday payment through the approved holiday payment controls.";
}

/**
 * Compare ledger entries (source_table='holiday_payments') with the visible
 * holiday_payments rows. Pure function — no DB calls, no mutations.
 */
export function findIntegrityIssues(input: {
  ledger: LedgerRow[];
  payments: PaymentRow[];
  periodsById?: Record<string, PeriodInfo>;
}): IntegrityIssue[] {
  const { ledger, payments, periodsById = {} } = input;
  const issues: IntegrityIssue[] = [];

  const ledgerByPaymentId = new Map<string, LedgerRow>();
  for (const e of ledger) {
    if (
      e.source_table === "holiday_payments" &&
      e.source_id &&
      e.entry_type === "holiday_taken"
    ) {
      ledgerByPaymentId.set(e.source_id, e);
    }
  }

  // 1. Payments without a matching ledger entry — these reduce nothing
  for (const p of payments) {
    const matching = ledgerByPaymentId.get(p.id);
    const period = p.payroll_period_id ? periodsById[p.payroll_period_id] : null;
    const periodStatus = period?.status ?? null;

    if (!matching) {
      issues.push({
        code: "payment_without_ledger",
        severity: "warning",
        message:
          "A holiday payment exists with no matching ledger entry — balance is NOT being reduced for it.",
        guidance: guidanceFor(periodStatus),
        paymentId: p.id,
        periodId: p.payroll_period_id,
        periodStatus,
      });
      continue;
    }

    const ledgerAbsHours = Math.abs(Number(matching.hours));
    const paymentHours = Math.abs(Number(p.hours));
    if (Math.abs(ledgerAbsHours - paymentHours) > 0.005) {
      issues.push({
        code: "hours_mismatch",
        severity: "warning",
        message: `Ledger hours (${ledgerAbsHours}) differ from payment hours (${paymentHours}).`,
        guidance: guidanceFor(periodStatus),
        paymentId: p.id,
        ledgerId: matching.id,
        periodId: p.payroll_period_id,
        periodStatus,
      });
    }

    if (matching.amount != null) {
      const ledgerAbsAmount = Math.abs(Number(matching.amount));
      const paymentTotal = Math.abs(Number(p.total));
      if (Math.abs(ledgerAbsAmount - paymentTotal) > 0.005) {
        issues.push({
          code: "amount_mismatch",
          severity: "warning",
          message: `Ledger amount (${ledgerAbsAmount}) differs from payment total (${paymentTotal}).`,
          guidance: guidanceFor(periodStatus),
          paymentId: p.id,
          ledgerId: matching.id,
          periodId: p.payroll_period_id,
          periodStatus,
        });
      }
    }

    if (periodStatus && APPROVED_STATUSES.includes(periodStatus)) {
      // Informational only: flag that correcting anything here requires controlled reversal
      // We surface this only if there's another issue on the same payment, captured implicitly above.
    }
  }

  // 2. Ledger entries that point at a missing holiday_payments row (orphan)
  const paymentIds = new Set(payments.map((p) => p.id));
  for (const [paymentId, entry] of ledgerByPaymentId.entries()) {
    if (!paymentIds.has(paymentId)) {
      issues.push({
        code: "ledger_without_payment",
        severity: "error",
        message:
          "A ledger entry points to a holiday payment that no longer exists — balance is still being reduced for a deleted payment.",
        guidance:
          "This is exactly the bug pattern that hid Viktoriia-style balances. The orphan ledger row should be reversed through a controlled correction.",
        ledgerId: entry.id,
      });
    }
  }

  return issues;
}

/**
 * Returns true if any issue affects an approved/locked period — used by the
 * dialog to render the controlled-reversal banner.
 */
export function hasApprovedPeriodImpact(issues: IntegrityIssue[]): boolean {
  return issues.some(
    (i) => i.periodStatus && APPROVED_STATUSES.includes(i.periodStatus)
  );
}

/**
 * Pure planner for the controlled "Reverse orphan ledger entry" action.
 *
 * Inputs are the ledger row the admin wants to reverse plus the current
 * holiday_payments rows for that employee + leave year. Returns whether
 * the reversal is allowed and the projected reversing entry. No I/O.
 */
export interface OrphanReversalPlan {
  allowed: boolean;
  reason?: string;
  hoursToReverse: number;
  amountToReverse: number | null;
  projectedAvailable: number;
  reversingEntry: {
    entry_type: "correction";
    hours: number;
    amount: number | null;
    source_table: "holiday_ledger";
    source_id: string;
    notes: string;
  } | null;
}

export function planOrphanReversal(input: {
  ledgerRow: LedgerRow;
  currentPayments: PaymentRow[];
  currentAvailable: number;
  reason?: string;
  /** Optional: the period status of the row's source payment, if known. */
  sourcePeriodStatus?: PeriodStatus | null;
}): OrphanReversalPlan {
  const { ledgerRow, currentPayments, currentAvailable, reason, sourcePeriodStatus } = input;

  const hoursToReverse = -Number(ledgerRow.hours);
  const amountToReverse =
    ledgerRow.amount != null ? -Number(ledgerRow.amount) : null;
  const projectedAvailable = currentAvailable + hoursToReverse;

  const refuse = (reasonStr: string): OrphanReversalPlan => ({
    allowed: false,
    reason: reasonStr,
    hoursToReverse,
    amountToReverse,
    projectedAvailable: currentAvailable,
    reversingEntry: null,
  });

  if (ledgerRow.entry_type !== "holiday_taken") {
    return refuse(
      "Only holiday_taken ledger rows can be reversed via this flow."
    );
  }
  if (ledgerRow.source_table !== "holiday_payments" || !ledgerRow.source_id) {
    return refuse(
      "Only holiday_payments-sourced ledger rows can be reversed via this flow."
    );
  }

  const stillExists = currentPayments.some((p) => p.id === ledgerRow.source_id);
  if (stillExists) {
    return refuse(
      "Ledger row is not orphan: the linked holiday payment still exists."
    );
  }

  if (sourcePeriodStatus && APPROVED_STATUSES.includes(sourcePeriodStatus)) {
    return refuse(
      "This issue affects an approved or locked payroll period. Reopen or reverse through a controlled process before correction."
    );
  }

  const noteParts = [
    "Reversal of orphan holiday ledger entry after deleted holiday payment",
    `original ledger: ${ledgerRow.id}`,
    `original source: holiday_payments:${ledgerRow.source_id}`,
  ];
  if (reason && reason.trim().length > 0) {
    noteParts.push(`reason: ${reason.trim()}`);
  }

  return {
    allowed: true,
    hoursToReverse,
    amountToReverse,
    projectedAvailable,
    reversingEntry: {
      entry_type: "correction",
      hours: hoursToReverse,
      amount: amountToReverse,
      source_table: "holiday_ledger",
      source_id: ledgerRow.id,
      notes: noteParts.join(" · "),
    },
  };
}

