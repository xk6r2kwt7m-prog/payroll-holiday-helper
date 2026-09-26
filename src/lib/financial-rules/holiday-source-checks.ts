/** Pure source reconciliation. Callers supply one employee and leave year.
 * Detect disagreement; never rewrite evidence or invent entitlement. */
export interface LedgerSource {
  entry_type: string;
  hours: number | string;
  amount?: number | string | null;
  source_table?: string | null;
  source_id?: string | null;
}
export interface PaymentSource { id?: string; hours?: number | string; total: number | string }
export interface AccrualSource { id?: string; holiday_accrued_hours: number | string | null }
const differs = (a: unknown, b: unknown) => {
  const left = Number(a), right = Number(b);
  return !Number.isFinite(left) || !Number.isFinite(right) || Math.abs(left - right) > 0.005;
};
export function holidaySourcesDisagree(ledger: LedgerSource[], payments: PaymentSource[], entries: AccrualSource[]): boolean {
  const rows = new Map<string, LedgerSource[]>();
  for (const row of ledger) {
    if (!row.source_table || !row.source_id) continue;
    const key = `${row.source_table}:${row.source_id}`;
    rows.set(key, [...(rows.get(key) ?? []), row]);
  }
  for (const payment of payments) {
    if (!payment.id) continue;
    const debits = (rows.get(`holiday_payments:${payment.id}`) ?? [])
      .filter(row => ['holiday_taken', 'payout_on_termination'].includes(row.entry_type));
    if (debits.length !== 1) return true;
    if (payment.hours !== undefined && differs(debits[0].hours, -Number(payment.hours))) return true;
    // A missing amount is legacy evidence requiring review, not zero money.
    if (debits[0].amount == null || differs(debits[0].amount, -Number(payment.total))) return true;
  }
  for (const entry of entries) {
    if (!entry.id) continue;
    const accrual = (rows.get(`payroll_entries:${entry.id}`) ?? []).filter(row => row.entry_type === 'accrual');
    if (accrual.length > 1 || (accrual.length === 1 && differs(accrual[0].hours, entry.holiday_accrued_hours ?? 0))) return true;
  }
  return false;
}
