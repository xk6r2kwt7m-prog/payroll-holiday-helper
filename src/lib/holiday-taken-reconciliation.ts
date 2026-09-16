/**
 * Pure reconciliation of "holiday taken" between the two surfaces that report it:
 *
 *   - holiday_payments  → what the Holidays dashboard historically summed
 *   - holiday_ledger    → the declared single source of truth
 *
 * Some ledger `holiday_taken` / `payout_on_termination` rows have NO live
 * holiday_payments row behind them (historical backfill from balance snapshots,
 * or a payment that was later deleted). Those hours were invisible on the
 * Holidays dashboard while the employee detail sheet and the Record Holiday
 * Taken dialog (both ledger-based) showed them — the Aris / Luisa mismatch.
 *
 * These helpers compute the ledger-only portion so the dashboard can add it
 * WITHOUT double counting payments. Read-only: nothing here mutates data.
 */

export interface ReconLedgerRow {
  id: string;
  employee_id: string;
  entry_type: string;
  hours: number;
  source_table: string | null;
  source_id: string | null;
}

const TAKEN_TYPES = new Set(["holiday_taken", "payout_on_termination"]);

/**
 * IDs referenced by reversal rows (`correction` entries that cancel a taken
 * entry). A reversed taken row must not be counted again.
 */
export function reversedSourceIds(rows: ReconLedgerRow[]): Set<string> {
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.entry_type !== "correction") continue;
    if (Number(r.hours) <= 0) continue; // only positive (add-back) reversals
    if (r.source_id) ids.add(r.source_id);
  }
  return ids;
}

/**
 * Hours taken that exist in the ledger but are not represented by any live
 * holiday_payments row, keyed by employee_id. Always >= 0.
 */
export function ledgerOnlyTakenByEmployee(
  rows: ReconLedgerRow[],
  livePaymentIds: Set<string>,
): Map<string, number> {
  const reversed = reversedSourceIds(rows);
  const out = new Map<string, number>();

  for (const r of rows) {
    if (!TAKEN_TYPES.has(r.entry_type)) continue;
    const linkedPaymentId =
      r.source_table === "holiday_payments" && r.source_id ? r.source_id : null;
    // Already counted from holiday_payments on the dashboard.
    if (linkedPaymentId && livePaymentIds.has(linkedPaymentId)) continue;
    // Reversed by a correction — either by payment id or by ledger row id.
    if (reversed.has(r.id) || (linkedPaymentId && reversed.has(linkedPaymentId))) continue;

    const hours = Math.abs(Number(r.hours) || 0);
    if (hours === 0) continue;
    out.set(r.employee_id, Math.round(((out.get(r.employee_id) || 0) + hours) * 100) / 100);
  }

  return out;
}
