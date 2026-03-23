import { useMemo } from "react";
import { useHolidayLedger } from "@/hooks/useHolidayLedger";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface HolidayYearSummary {
  accruedHours: number;
  carryOverHours: number;
  takenHours: number;
  paidAmount: number;
  availableHours: number;
  leaveYear: number;
}

/**
 * Single source of truth for an employee's holiday balance in a given leave year.
 * Derives accrued, carry-over, and taken from the holiday_ledger.
 * Derives paid amount from holiday_payments.
 */
export function useHolidayYearSummary(
  employeeId?: string,
  leaveYear?: number
): { summary: HolidayYearSummary | null; isLoading: boolean } {
  const { tenantId } = useTenant();
  const year = leaveYear ?? new Date().getFullYear();
  const leaveYearStart = `${year}-01-01`;

  const { data: ledgerEntries, isLoading: ledgerLoading } = useHolidayLedger(
    employeeId,
    leaveYearStart
  );

  // Fetch paid amount from holiday_payments for the year
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["holiday_payments_year_total", tenantId, employeeId, year],
    enabled: !!employeeId && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_payments")
        .select("total")
        .eq("employee_id", employeeId!)
        .eq("leave_year_start", leaveYearStart)
        .eq("leave_year_end", `${year}-12-31`);
      if (error) throw error;
      return data;
    },
  });

  const summary = useMemo<HolidayYearSummary | null>(() => {
    if (!employeeId || !ledgerEntries) return null;

    let accrued = 0;
    let carryOver = 0;
    let taken = 0;

    for (const entry of ledgerEntries) {
      const h = Number(entry.hours);
      switch (entry.entry_type) {
        case "accrual":
          accrued += h;
          break;
        case "carry_over_in":
          carryOver += h;
          break;
        case "holiday_taken":
          taken += Math.abs(h); // stored as negative, we want positive taken
          break;
        case "manual_adjustment":
        case "correction":
          // Positive adjustments increase accrual, negative increase taken
          if (h >= 0) accrued += h;
          else taken += Math.abs(h);
          break;
        case "payout_on_termination":
          taken += Math.abs(h);
          break;
        case "carry_over_out":
        case "expiry":
          // These reduce balance — treat as deductions
          taken += Math.abs(h);
          break;
        default:
          // Unknown entry types: add to accrual if positive, taken if negative
          if (h >= 0) accrued += h;
          else taken += Math.abs(h);
          break;
      }
    }

    const paidAmount = (payments || []).reduce(
      (sum, p) => sum + Number(p.total),
      0
    );

    const availableHours = accrued + carryOver - taken;

    return {
      accruedHours: accrued,
      carryOverHours: carryOver,
      takenHours: taken,
      paidAmount,
      availableHours,
      leaveYear: year,
    };
  }, [employeeId, ledgerEntries, payments, year]);

  return { summary, isLoading: ledgerLoading || paymentsLoading };
}
