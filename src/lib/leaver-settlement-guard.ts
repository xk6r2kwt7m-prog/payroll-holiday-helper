/**
 * Duplicate-settlement guard for the Settle Leaver dialog.
 *
 * A leaver may only hold ONE unreversed settlement per leave year — a second
 * one double-counts holiday taken in the ledger. But a settlement that has
 * been reversed (superseded by a corrected settlement, or removed together
 * with a deleted draft payroll period) must NOT block a new one.
 *
 * Two things make a settlement "live":
 *  - the holiday_payments row still exists (deleting a payroll period removes
 *    its payments and their ledger rows, so those simply disappear), and
 *  - no reversal / correction ledger row references that payment id.
 */

export interface GuardPaymentRow {
  id: string;
  payroll_period_id?: string | null;
  hours?: number | null;
  holiday_taken_date?: string | null;
  leave_year_start?: string | null;
  notes?: string | null;
}

export interface GuardLedgerRow {
  entry_type?: string | null;
  source_table?: string | null;
  source_id?: string | null;
  notes?: string | null;
}

/** True when a ledger correction/reversal row references this payment. */
export function isSettlementReversed(
  paymentId: string,
  ledger: GuardLedgerRow[] | null | undefined,
): boolean {
  return (ledger || []).some((l) => {
    const type = String(l.entry_type ?? "");
    if (type !== "correction" && type !== "manual_adjustment") return false;
    const notes = String(l.notes ?? "");
    const referencesPayment =
      notes.includes(paymentId) ||
      (l.source_table === "holiday_payments" && l.source_id === paymentId);
    if (!referencesPayment) return false;
    return /revers|supersed/i.test(notes);
  });
}

/**
 * Returns the settlement payment that blocks a new settlement, or null.
 * Only live (existing + unreversed) settlements in the same leave year, or in
 * the selected period, block.
 */
export function findBlockingSettlement(args: {
  payments: GuardPaymentRow[] | null | undefined;
  ledger?: GuardLedgerRow[] | null;
  leaveYearStart: string;
  periodId?: string | null;
}): GuardPaymentRow | null {
  const { payments, ledger, leaveYearStart, periodId } = args;
  const candidates = (payments || []).filter(
    (p) =>
      (p.leave_year_start === leaveYearStart ||
        (!!periodId && p.payroll_period_id === periodId)) &&
      /settlement/i.test(p.notes || ""),
  );
  const live = candidates.filter((p) => !isSettlementReversed(p.id, ledger));
  return live[0] ?? null;
}

/** Plain-English blocking message naming where the settlement was recorded. */
export function describeBlockingSettlement(
  settlement: GuardPaymentRow,
  periodName?: string | null,
): string {
  const hours = Number(settlement.hours ?? 0).toFixed(2);
  const date = settlement.holiday_taken_date ?? "an earlier date";
  const where = periodName ? ` in ${periodName}` : "";
  return `Already settled — ${hours} h recorded on ${date}${where}. Reverse that settlement before recording a new one.`;
}
