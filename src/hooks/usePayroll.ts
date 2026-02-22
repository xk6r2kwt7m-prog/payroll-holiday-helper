import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PayrollPeriod = Tables<"payroll_periods">;
export type PayrollPeriodInsert = TablesInsert<"payroll_periods">;
export type PayrollPeriodUpdate = TablesUpdate<"payroll_periods">;

export type PayrollEntry = Tables<"payroll_entries">;
export type PayrollEntryInsert = TablesInsert<"payroll_entries">;
export type PayrollEntryUpdate = TablesUpdate<"payroll_entries">;

export function usePayrollPeriods() {
  return useQuery({
    queryKey: ["payroll_periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data as PayrollPeriod[];
    },
  });
}

export function usePayrollPeriod(id: string) {
  return useQuery({
    queryKey: ["payroll_periods", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as PayrollPeriod | null;
    },
    enabled: !!id,
  });
}

export function usePayrollEntries(periodId?: string) {
  return useQuery({
    queryKey: ["payroll_entries", periodId],
    queryFn: async () => {
      let query = supabase
        .from("payroll_entries")
        .select(`
          *,
          employees (
            id,
            forename,
            surname,
            department,
            status,
            hourly_rate,
            service_charge,
            bank_account_no,
            sort_code,
            ni_number
          )
        `)
        .order("total_pay", { ascending: false });
      
      if (periodId) {
        query = query.eq("payroll_period_id", periodId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePayrollPeriod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (period: PayrollPeriodInsert) => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .insert(period)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
    },
  });
}

export function useUpdatePayrollPeriod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PayrollPeriodUpdate }) => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
    },
  });
}

export function useApprovePayrollPeriod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("payroll_periods")
        .update({ 
          status: "approved" as const,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
    },
  });
}

export function useCreatePayrollEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entry: PayrollEntryInsert) => {
      const { data, error } = await supabase
        .from("payroll_entries")
        .insert(entry)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
    },
  });
}

export function useUpdatePayrollEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PayrollEntryUpdate }) => {
      const { data, error } = await supabase
        .from("payroll_entries")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
    },
  });
}

export function useBulkUpdatePayrollEntries() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entries: { id: string; updates: PayrollEntryUpdate }[]) => {
      const results = await Promise.all(
        entries.map(async ({ id, updates }) => {
          const { data, error } = await supabase
            .from("payroll_entries")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
          
          if (error) throw error;
          return data;
        })
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
    },
  });
}

export function useCopyPayrollPeriod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sourcePeriodId, 
      newPeriodName, 
      startDate, 
      endDate, 
      payDate 
    }: { 
      sourcePeriodId: string; 
      newPeriodName: string; 
      startDate: string; 
      endDate: string;
      payDate?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Create new period
      const { data: newPeriod, error: periodError } = await supabase
        .from("payroll_periods")
        .insert({
          period_name: newPeriodName,
          start_date: startDate,
          end_date: endDate,
          pay_date: payDate || null,
          status: "draft" as const,
          imported_by: user?.id,
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Get source entries with employee status
      const { data: sourceEntries, error: entriesError } = await supabase
        .from("payroll_entries")
        .select("*, employees(id, status)")
        .eq("payroll_period_id", sourcePeriodId);

      if (entriesError) throw entriesError;

      // Copy entries - exclude leavers (UK best practice: leavers should not carry into subsequent periods)
      if (sourceEntries && sourceEntries.length > 0) {
        const activeEntries = sourceEntries.filter((entry: any) => {
          const empStatus = entry.employees?.status;
          return empStatus === "active" || empStatus === "starter";
        });

        const newEntries = activeEntries.map((entry: any) => {
          const perfBonus = entry.performance_bonus || 0;
          const specBonus = entry.special_bonus || 0;
          return {
            payroll_period_id: newPeriod.id,
            employee_id: entry.employee_id,
            hourly_rate: entry.hourly_rate,
            service_charge: entry.service_charge,
            timesheet_hours: 0, // Reset timesheet hours
            performance_bonus: entry.performance_bonus,
            special_bonus: entry.special_bonus,
            holiday_accrued_hours: 0, // Will be recalculated
            total_pay: perfBonus + specBonus, // Include carried-over bonuses
            bank_details_exported: false,
          };
        });

        if (newEntries.length > 0) {
          const { error: insertError } = await supabase
            .from("payroll_entries")
            .insert(newEntries);

          if (insertError) throw insertError;
        }
      }

      return newPeriod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
    },
  });
}

export function useMarkBankDetailsExported() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entryIds: string[]) => {
      const { error } = await supabase
        .from("payroll_entries")
        .update({ bank_details_exported: true })
        .in("id", entryIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
    },
  });
}
