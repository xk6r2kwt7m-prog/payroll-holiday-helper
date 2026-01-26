import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type HolidayPayment = Tables<"holiday_payments">;
export type HolidayPaymentInsert = TablesInsert<"holiday_payments">;
export type HolidayPaymentUpdate = TablesUpdate<"holiday_payments">;

export type HolidayBalance = Tables<"holiday_balances">;
export type HolidayBalanceInsert = TablesInsert<"holiday_balances">;
export type HolidayBalanceUpdate = TablesUpdate<"holiday_balances">;

export function useHolidayPayments(periodId?: string) {
  return useQuery({
    queryKey: ["holiday_payments", periodId],
    queryFn: async () => {
      let query = supabase
        .from("holiday_payments")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department
          )
        `)
        .order("total", { ascending: false });
      
      if (periodId) {
        query = query.eq("payroll_period_id", periodId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

export function useHolidayBalances(employeeId?: string) {
  return useQuery({
    queryKey: ["holiday_balances", employeeId],
    queryFn: async () => {
      let query = supabase
        .from("holiday_balances")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department
          )
        `)
        .order("leave_year_start", { ascending: false });
      
      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateHolidayPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payment: HolidayPaymentInsert) => {
      const { data, error } = await supabase
        .from("holiday_payments")
        .insert(payment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday_payments"] });
    },
  });
}

export function useUpdateHolidayBalance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: HolidayBalanceUpdate }) => {
      const { data, error } = await supabase
        .from("holiday_balances")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday_balances"] });
    },
  });
}

// UK Holiday Law Constants
export const UK_HOLIDAY_LAW = {
  STATUTORY_WEEKS: 5.6,
  MAX_STATUTORY_DAYS: 28,
  ACCRUAL_RATE: 0.1207,
  NORMAL_LEAVE_WEEKS: 4,
  BASIC_LEAVE_WEEKS: 1.6,
  MAX_CARRYOVER_AGREED: 8,
  MAX_CARRYOVER_FAMILY_LEAVE: 28,
  MAX_CARRYOVER_SICKNESS: 20,
};

export const calculateHolidayAccrual = (hoursWorked: number): number => {
  return hoursWorked * UK_HOLIDAY_LAW.ACCRUAL_RATE;
};

export const formatCurrency = (amount: number, currency: string = "£"): string => {
  return `${currency}${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatHours = (hours: number): string => {
  return Number(hours).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
