import { isCommittedPayrollStatus } from "@/lib/payroll-status";
export interface HolidayYearSummary {
  accruedHours: number; carryOverHours: number; takenHours: number; paidAmount: number;
  availableHours: number; leaveYear: number; pendingAccruedHours: number;
  accruedIncludingPendingHours: number; availableIncludingPendingHours: number;
  requiresReview: boolean;
}
interface Ledger { entry_type: string; hours: number | string; source_table?: string | null; source_id?: string | null }
interface Payment { id?: string; total: number | string }
interface Entry { id?: string; holiday_accrued_hours: number | string | null; payroll_periods?: { period_name?: string | null; status?: string | null } | null }
/** Same year-scoped arithmetic for the dashboard, payment form and settlement.
 * The ledger is authoritative; unposted open-period accrual is shown separately.
 * Missing approved accrual/payment evidence raises a review flag, not a repair. */
export function summariseHolidayYear(year: number, ledger: Ledger[], payments: Payment[], entries: Entry[]): HolidayYearSummary {
  let accrued = 0, carry = 0, taken = 0;
  const posted = new Set<string>(), debited = new Set<string>();
  for (const row of ledger) {
    const h = Number(row.hours);
    if (!Number.isFinite(h)) throw new Error("Invalid holiday ledger hours; review the source record.");
    if (row.entry_type === "carry_over_in") carry += h;
    else if (row.entry_type === "accrual") accrued += h;
    else if (h >= 0) accrued += h;
    else taken -= h;
    if (row.entry_type === "accrual" && row.source_table === "payroll_entries" && row.source_id) posted.add(row.source_id);
    if (["holiday_taken", "payout_on_termination"].includes(row.entry_type) && row.source_table === "holiday_payments" && row.source_id) debited.add(row.source_id);
  }
  const corrected = new Set(entries.map(e => e.payroll_periods?.period_name ?? "").filter(n => n.includes("[Corrected]")).map(n => n.replace(" [Corrected]", "").trim()));
  let pending = 0, requiresReview = payments.some(p => p.id && !debited.has(p.id));
  for (const entry of entries) {
    const name = entry.payroll_periods?.period_name?.trim() ?? "";
    if (!name.includes("[Corrected]") && corrected.has(name)) continue;
    const hours = Number(entry.holiday_accrued_hours ?? 0);
    if (!Number.isFinite(hours)) throw new Error("Invalid payroll accrual; review the source record.");
    if (entry.id && posted.has(entry.id)) continue;
    if (isCommittedPayrollStatus(entry.payroll_periods?.status)) {
      if (entry.id && hours !== 0) requiresReview = true;
    } else pending += hours;
  }
  const paid = payments.reduce((sum,p) => sum + Number(p.total),0);
  if (!Number.isFinite(paid)) throw new Error("Invalid holiday payment total.");
  const available = accrued + carry - taken;
  return { accruedHours: accrued, carryOverHours: carry, takenHours: taken, paidAmount: paid,
    availableHours: available, leaveYear: year, pendingAccruedHours: pending,
    accruedIncludingPendingHours: accrued + pending, availableIncludingPendingHours: available + pending, requiresReview };
}
