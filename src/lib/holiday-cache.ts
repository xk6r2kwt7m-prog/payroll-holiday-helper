import type { QueryClient } from "@tanstack/react-query";

/**
 * Holiday entitlement is derived from payroll data (timesheet hours drive the
 * accrual formula in the database). Whenever payroll entries change — an edit,
 * an import, an added or removed employee — every holiday-derived view must be
 * refreshed so entitlement counts follow the payroll figures immediately,
 * whether or not the period has been approved.
 *
 * This only refreshes caches; no data is written or recalculated client-side.
 */
export function invalidateHolidayDerivedQueries(queryClient: QueryClient) {
  const keys = [
    ["holiday_ledger"],
    ["holiday_pending_accrual"],
    ["holiday_payments"],
    ["holiday_payments_year_total"],
    ["holiday_balances"],
    ["leaver_settlement_candidates"],
  ];
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}
