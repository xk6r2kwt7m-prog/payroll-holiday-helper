import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface HolidayLedgerEntry {
  id: string;
  employee_id: string;
  tenant_id: string;
  leave_year_start: string;
  entry_date: string;
  entry_type: string;
  hours: number;
  amount: number | null;
  source_table: string | null;
  source_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export function useHolidayLedger(employeeId?: string, leaveYearStart?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["holiday_ledger", tenantId, employeeId, leaveYearStart],
    enabled: !!employeeId && !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from("holiday_ledger")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("entry_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (leaveYearStart) {
        query = query.eq("leave_year_start", leaveYearStart);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HolidayLedgerEntry[];
    },
  });
}

export function useHolidayLedgerBalance(employeeId?: string, leaveYearStart?: string) {
  const { data: entries, ...rest } = useHolidayLedger(employeeId, leaveYearStart);

  const balance = (entries || []).reduce((sum, e) => sum + Number(e.hours), 0);

  return { entries, balance, ...rest };
}

export interface HolidayLedgerYearBalance {
  id: string;
  employee_id: string;
  employees: {
    forename: string | null;
    surname: string | null;
    department: string | null;
    status: string | null;
  } | null;
  hours_accrued: number;
  hours_taken: number;
  carry_over_hours: number;
  adjustment_hours: number;
  remaining_hours: number;
}

/**
 * Live ledger-derived balances for a leave year. The holiday ledger is the single
 * source of truth for balances (see project rules) — this replaces reads of the
 * legacy holiday_balances snapshot table for reporting.
 */
export function useHolidayLedgerBalancesByYear(year: number) {
  const { tenantId } = useTenant();
  const leaveYearStart = `${year}-01-01`;

  return useQuery({
    queryKey: ["holiday_ledger", tenantId, "year_balances", year],
    enabled: !!tenantId,
    queryFn: async (): Promise<HolidayLedgerYearBalance[]> => {
      const { data, error } = await supabase
        .from("holiday_ledger")
        .select("employee_id, entry_type, hours, employees ( forename, surname, department, status )")
        .eq("tenant_id", tenantId!)
        .eq("leave_year_start", leaveYearStart);
      if (error) throw error;

      const byEmployee = new Map<string, HolidayLedgerYearBalance>();
      for (const row of (data || []) as any[]) {
        let agg = byEmployee.get(row.employee_id);
        if (!agg) {
          agg = {
            id: row.employee_id,
            employee_id: row.employee_id,
            employees: row.employees ?? null,
            hours_accrued: 0,
            hours_taken: 0,
            carry_over_hours: 0,
            adjustment_hours: 0,
            remaining_hours: 0,
          };
          byEmployee.set(row.employee_id, agg);
        }
        const hours = Number(row.hours || 0);
        switch (row.entry_type) {
          case "accrual":
            agg.hours_accrued += hours;
            break;
          case "carry_over_in":
            agg.carry_over_hours += hours;
            break;
          case "holiday_taken":
          case "payout_on_termination":
            // stored as negative hours in the ledger
            agg.hours_taken += -hours;
            break;
          default:
            // manual_adjustment, correction, carry_over_out, expiry
            agg.adjustment_hours += hours;
        }
      }

      const list = [...byEmployee.values()].map((agg) => ({
        ...agg,
        hours_accrued: Math.round(agg.hours_accrued * 100) / 100,
        hours_taken: Math.round(agg.hours_taken * 100) / 100,
        carry_over_hours: Math.round(agg.carry_over_hours * 100) / 100,
        adjustment_hours: Math.round(agg.adjustment_hours * 100) / 100,
        remaining_hours:
          Math.round(
            (agg.hours_accrued + agg.carry_over_hours + agg.adjustment_hours - agg.hours_taken) * 100,
          ) / 100,
      }));

      return list.sort((a, b) => b.hours_accrued - a.hours_accrued);
    },
  });
}
