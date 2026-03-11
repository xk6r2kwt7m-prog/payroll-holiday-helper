import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return useQuery({
    queryKey: ["holiday_ledger", employeeId, leaveYearStart],
    enabled: !!employeeId,
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
