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
        .order("created_at", { ascending: false });
      
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
            status
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
