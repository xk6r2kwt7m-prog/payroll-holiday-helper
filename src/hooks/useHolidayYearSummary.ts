import { fetchAllRows } from "@/lib/fetch-all-rows";
import { useMemo } from "react";
import { useHolidayLedger } from "@/hooks/useHolidayLedger";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { summariseHolidayYear, type HolidayYearSummary } from "@/lib/holiday-year-summary";
export type { HolidayYearSummary } from "@/lib/holiday-year-summary";

/**
 * Single source of truth for an employee's holiday balance in a given leave year.
 * Derives accrued, carry-over, and taken from the holiday_ledger.
 * Derives paid amount from holiday_payments.
 *
 * Accrual only posts to the ledger when a payroll period is approved. To keep
 * the accrued figure truthful while periods are still open, we ALSO read
 * `holiday_accrued_hours` from payroll entries in draft/pending/rejected
 * periods and expose it separately as `pendingAccruedHours`. No data is
 * written — the ledger stays the committed source of truth.
 */
export function useHolidayYearSummary(
  employeeId?: string,
  leaveYear?: number
): { summary: HolidayYearSummary | null; isLoading: boolean; isError: boolean; refetch: () => void } {
  const { tenantId } = useTenant();
  const year = leaveYear ?? new Date().getFullYear();
  const leaveYearStart = `${year}-01-01`;

  const ledgerQuery = useHolidayLedger(
    employeeId,
    leaveYearStart
  );

  // Fetch paid amount from holiday_payments for the year
  const paymentsQuery = useQuery({
    queryKey: ["holiday_payments_year_total", tenantId, employeeId, year],
    enabled: !!employeeId && !!tenantId,
    queryFn: async () => {
      return fetchAllRows((from, to) => supabase
        .from("holiday_payments")
        .select("id, total")
        .eq("employee_id", employeeId!)
        .eq("leave_year_start", leaveYearStart)
        .eq("leave_year_end", `${year}-12-31`)
        .eq("tenant_id", tenantId!)
        .order("id").range(from, to));
    },
  });

  // Accrual from payroll periods that are NOT yet approved — this has not
  // reached the ledger yet, so it is reported as "pending".
  const pendingQuery = useQuery({
    queryKey: ["holiday_pending_accrual", tenantId, employeeId, year],
    enabled: !!employeeId && !!tenantId,
    queryFn: async () => {
      return fetchAllRows((from, to) => supabase
        .from("payroll_entries")
        .select(
          "id, holiday_accrued_hours, payroll_periods!inner(period_name, status, start_date, end_date)"
        )

        .eq("employee_id", employeeId!)
        .eq("tenant_id", tenantId!)
        .gte("payroll_periods.start_date", leaveYearStart)
        .lte("payroll_periods.start_date", `${year}-12-31`)
        .order("id").range(from, to));
    },
  });


  const ledgerEntries = ledgerQuery.data;
  const payments = paymentsQuery.data;
  const pendingRows = pendingQuery.data;
  const queries = [ledgerQuery, paymentsQuery, pendingQuery];
  const isLoading = queries.some(query => query.isFetching);
  const isError = queries.some(query => query.isError);

  const summary = useMemo<HolidayYearSummary | null>(() => {
    if (!employeeId || !tenantId || isLoading || isError || !ledgerEntries || !payments || !pendingRows) return null;

    return summariseHolidayYear(year, ledgerEntries, payments, pendingRows);
  }, [employeeId, tenantId, isLoading, isError, ledgerEntries, payments, pendingRows, year]);

  return {
    summary,
    isLoading,
    isError,
    refetch: () => { queries.forEach(query => { void query.refetch(); }); },
  };
}
