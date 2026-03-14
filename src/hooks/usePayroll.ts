import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/useTenant";
import { assertPermission } from "@/lib/permission-guard";

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
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (period: Omit<PayrollPeriodInsert, 'tenant_id'>) => {
      await assertPermission("view_pay_data", tenantId!);
      const { data, error } = await supabase
        .from("payroll_periods")
        .insert({ ...period, tenant_id: tenantId! })
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

export function useSubmitPayrollForReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("view_pay_data", null);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("payroll_periods")
        .update({ status: "pending" as const })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: user?.id || null,
        action: "update" as const,
        table_name: "payroll_periods",
        record_id: id,
        new_data: { operation: "submit_for_review", status: "pending" },
      });

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
      await assertPermission("view_pay_data", null);
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

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: user?.id || null,
        action: "approve" as const,
        table_name: "payroll_periods",
        record_id: id,
        new_data: { operation: "approve_and_lock" },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
    },
  });
}

export function useReopenPayrollPeriod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("view_pay_data", null);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("payroll_periods")
        .update({ 
          status: "draft" as const,
          approved_by: null,
          approved_at: null,
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;

      // Audit log - critical for compliance
      await supabase.from("audit_log").insert({
        user_id: user?.id || null,
        action: "update" as const,
        table_name: "payroll_periods",
        record_id: id,
        new_data: { operation: "reopen_period", previous_status: "approved" },
      });

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
      await assertPermission("view_pay_data", null);
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
      await assertPermission("view_pay_data", null);
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
      await assertPermission("view_pay_data", null);
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
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async ({ 
      sourcePeriodId, 
      newPeriodName, 
      startDate, 
      endDate, 
      payDate,
      periodWeeks,
      salesTotal,
    }: { 
      sourcePeriodId: string; 
      newPeriodName: string; 
      startDate: string; 
      endDate: string;
      payDate?: string;
      periodWeeks?: number;
      salesTotal?: number;
    }) => {
      await assertPermission("view_pay_data", tenantId!);
      const { data: { user } } = await supabase.auth.getUser();

      // Create new period
      const { data: newPeriod, error: periodError } = await supabase
        .from("payroll_periods")
        .insert({
          period_name: newPeriodName,
          start_date: startDate,
          end_date: endDate,
          pay_date: payDate || null,
          period_weeks: periodWeeks || 4,
          sales_total: salesTotal || 0,
          status: "draft" as const,
          imported_by: user?.id,
          tenant_id: tenantId!,
        } as any)
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
            timesheet_hours: 0,
            imported_hours: null,
            performance_bonus: entry.performance_bonus,
            special_bonus: entry.special_bonus,
            holiday_accrued_hours: 0,
            total_pay: perfBonus + specBonus,
            bank_details_exported: false,
            adjustment_note: null,
            tenant_id: tenantId!,
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

export function useDeletePayrollPeriod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("view_pay_data", null);
      const { data: { user } } = await supabase.auth.getUser();

      // Delete entries first (foreign key constraint)
      const { error: entriesError } = await supabase
        .from("payroll_entries")
        .delete()
        .eq("payroll_period_id", id);
      if (entriesError) throw entriesError;

      // Delete holiday payments linked to this period
      const { error: holError } = await supabase
        .from("holiday_payments")
        .delete()
        .eq("payroll_period_id", id);
      if (holError) throw holError;

      // Delete the period itself
      const { error } = await supabase
        .from("payroll_periods")
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Audit log
      await supabase.from("audit_log").insert({
        user_id: user?.id || null,
        action: "delete" as const,
        table_name: "payroll_periods",
        record_id: id,
        new_data: { operation: "delete_draft_period" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
      queryClient.invalidateQueries({ queryKey: ["holiday_payments"] });
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
