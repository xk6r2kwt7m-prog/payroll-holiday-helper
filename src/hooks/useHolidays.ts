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
          ),
          payroll_periods (
            id,
            period_name,
            start_date,
            end_date
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

// Get all holiday payments for all employees across all periods
export function useAllHolidayPayments() {
  return useQuery({
    queryKey: ["holiday_payments", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_payments")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department,
            hourly_rate,
            start_date
          ),
          payroll_periods (
            id,
            period_name,
            start_date,
            end_date
          )
        `)
        .order("created_at", { ascending: false });
      
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
            department,
            status
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

// Get holiday balances for a specific leave year
export function useHolidayBalancesByYear(year: number) {
  const leaveYearStart = `${year}-01-01`;
  const leaveYearEnd = `${year}-12-31`;
  
  return useQuery({
    queryKey: ["holiday_balances", "year", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_balances")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department,
            status,
            hourly_rate
          )
        `)
        .eq("leave_year_start", leaveYearStart)
        .eq("leave_year_end", leaveYearEnd)
        .order("hours_accrued", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

// Get holiday payments for a specific leave year (by holiday_taken_date)
export function useHolidayPaymentsByYear(year: number) {
  const leaveYearStart = `${year}-01-01`;
  const leaveYearEnd = `${year}-12-31`;
  
  return useQuery({
    queryKey: ["holiday_payments", "year", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_payments")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department
          ),
          payroll_periods (
            id,
            period_name,
            start_date,
            end_date
          )
        `)
        .eq("leave_year_start", leaveYearStart)
        .eq("leave_year_end", leaveYearEnd)
        .order("holiday_taken_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

// Get all payroll entries with holiday accrual data
export function useAllPayrollEntriesWithHoliday() {
  return useQuery({
    queryKey: ["payroll_entries", "holiday_summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_entries")
        .select(`
          id,
          employee_id,
          payroll_period_id,
          timesheet_hours,
          holiday_accrued_hours,
          hourly_rate,
          employees (
            id,
            forename,
            surname,
            department,
            start_date,
            hourly_rate
          ),
          payroll_periods (
            id,
            period_name,
            start_date,
            end_date,
            status
          )
        `)
        .order("created_at", { ascending: false });
      
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

      // Recalculate and update the payroll period's holidays_total and grand_total
      await recalcPayrollPeriodTotals(payment.payroll_period_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday_payments"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
    },
  });
}

// Shared helper: recalculate a payroll period's holidays_total and grand_total
export async function recalcPayrollPeriodTotals(periodId: string) {
  // Sum all holiday payments for this period
  const { data: payments, error: paymentsErr } = await supabase
    .from("holiday_payments")
    .select("total")
    .eq("payroll_period_id", periodId);
  if (paymentsErr) throw paymentsErr;
  const holidaysTotal = (payments || []).reduce((s, p) => s + Number(p.total), 0);

  // Sum all payroll entries for this period
  const { data: entries, error: entriesErr } = await supabase
    .from("payroll_entries")
    .select("total_pay")
    .eq("payroll_period_id", periodId);
  if (entriesErr) throw entriesErr;
  const timesheetTotal = (entries || []).reduce((s, e) => s + Number(e.total_pay), 0);

  const grandTotal = timesheetTotal + holidaysTotal;

  const { error: updateErr } = await supabase
    .from("payroll_periods")
    .update({ holidays_total: holidaysTotal, grand_total: grandTotal })
    .eq("id", periodId);
  if (updateErr) throw updateErr;
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

export function useCreateHolidayBalance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (balance: HolidayBalanceInsert) => {
      const { data, error } = await supabase
        .from("holiday_balances")
        .insert(balance)
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

// Holiday adjustments hook
export function useHolidayAdjustments(year?: number) {
  return useQuery({
    queryKey: ["holiday_adjustments", year],
    queryFn: async () => {
      let query = supabase
        .from("holiday_adjustments")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department
          )
        `)
        .order("created_at", { ascending: false });

      if (year) {
        query = query
          .eq("leave_year_start", `${year}-01-01`)
          .eq("leave_year_end", `${year}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAllHolidayAdjustments() {
  return useQuery({
    queryKey: ["holiday_adjustments", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_adjustments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
  STANDARD_WEEK_HOURS: 40,
};

export const calculateHolidayAccrual = (hoursWorked: number): number => {
  return hoursWorked * UK_HOLIDAY_LAW.ACCRUAL_RATE;
};

// Calculate annual entitlement based on weekly hours
export const calculateAnnualEntitlement = (weeklyHours: number): number => {
  return weeklyHours * UK_HOLIDAY_LAW.STATUTORY_WEEKS;
};

export const formatCurrency = (amount: number, currency: string = "£"): string => {
  return `${currency}${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatHours = (hours: number): string => {
  return Number(hours).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const hoursToDays = (hours: number, hoursPerDay: number = 8): string => {
  const days = hours / hoursPerDay;
  return days.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

// Calculate employee holiday summary
export interface EmployeeHolidaySummary {
  employeeId: string;
  employeeName: string;
  department: string;
  totalAccrued: number;
  totalTaken: number;
  totalPaid: number;
  balance: number;
  periodBreakdown: {
    periodId: string;
    periodName: string;
    accrued: number;
    taken: number;
    paid: number;
  }[];
}
