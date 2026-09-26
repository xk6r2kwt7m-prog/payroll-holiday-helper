import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { useTenant } from "@/hooks/useTenant";
import { invalidateHolidayDerivedQueries } from "@/lib/holiday-cache";
import { assertPermission } from "@/lib/permission-guard";
import { DELETE_RPC, describeRecoveryRpcError } from "@/lib/payroll-period-restore";


export type PayrollPeriod = Tables<"payroll_periods">;
export type PayrollPeriodInsert = TablesInsert<"payroll_periods">;
export type PayrollPeriodUpdate = TablesUpdate<"payroll_periods">;

export type PayrollEntry = Tables<"payroll_entries">;
export type PayrollEntryInsert = TablesInsert<"payroll_entries">;
export type PayrollEntryUpdate = TablesUpdate<"payroll_entries">;

export function usePayrollPeriods() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["payroll_periods", tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as PayrollPeriod[];
      const data = await fetchAllRows((from, to) => supabase
        .from("payroll_periods")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("start_date", { ascending: false }).order("id").range(from, to));
      
      return data as PayrollPeriod[];
    },
    enabled: !!tenantId,
  });
}

export function usePayrollPeriod(id: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["payroll_periods", tenantId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as PayrollPeriod | null;
    },
    enabled: !!id && !!tenantId,
  });
}

export function usePayrollEntries(periodId?: string, options: { enabled?: boolean } = {}) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["payroll_entries", tenantId, periodId ?? (options.enabled === false ? "no-period" : undefined)],
    queryFn: async () => {
      if (!tenantId) return [];
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
            start_date,
            end_date,
            is_test_record,
            hourly_rate,
            service_charge,
            date_of_birth,
            service_charge_eligible,
            settlement_status,
            has_bank_details,
            has_ni_number,
            has_passport,
            has_share_code
          )
        `)
        .eq("tenant_id", tenantId)
        .order("total_pay", { ascending: false });
      
      if (periodId) {
        query = query.eq("payroll_period_id", periodId);
      }
      
      const data = await fetchAllRows((from, to) => query.order("id").range(from, to));
      
      return data;
    },
    enabled: !!tenantId && options.enabled !== false,
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
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
    },
  });
}

export function useUpdatePayrollPeriod() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PayrollPeriodUpdate }) => {
      await assertPermission("view_pay_data", tenantId!);
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
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
    },
  });
}

export function useSubmitPayrollForReview() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("view_pay_data", tenantId!);
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
        tenant_id: tenantId,
        new_data: { operation: "submit_for_review", status: "pending" },
      });

      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
      invalidateHolidayDerivedQueries(queryClient);
    },
  });
}

export function useApprovePayrollPeriod() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("view_pay_data", tenantId!);
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
        tenant_id: tenantId,
        new_data: { operation: "approve_and_lock" },
      });

      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
      invalidateHolidayDerivedQueries(queryClient);
    },
  });
}

export function useReopenPayrollPeriod() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("view_pay_data", tenantId!);
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
        tenant_id: tenantId,
        new_data: { operation: "reopen_period", previous_status: "approved" },
      });

      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
      invalidateHolidayDerivedQueries(queryClient);
    },
  });
}

export function useCreatePayrollEntry() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (entry: PayrollEntryInsert) => {
      await assertPermission("view_pay_data", tenantId!);
      const { data, error } = await supabase
        .from("payroll_entries")
        .insert(entry)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_entries", tenantId] });
      invalidateHolidayDerivedQueries(queryClient);
    },
  });
}

export function useUpdatePayrollEntry() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async ({ id, updates, periodStatus }: { id: string; updates: PayrollEntryUpdate; periodStatus?: string }) => {
      if (periodStatus === "approved") {
        throw new Error("This payroll period is locked and cannot be edited. Reopen the period first.");
      }
      await assertPermission("view_pay_data", tenantId!);
      const { data, error } = await supabase
        .from("payroll_entries")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        if (error.message?.includes("locked")) throw new Error("This payroll period is locked and cannot be edited. Reopen the period first.");
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_entries", tenantId] });
      invalidateHolidayDerivedQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
    },
  });
}

export function useBulkUpdatePayrollEntries() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (entries: { id: string; updates: PayrollEntryUpdate }[]) => {
      await assertPermission("view_pay_data", tenantId!);
      const results = await Promise.allSettled(
        entries.map(async ({ id, updates }) => {
          const { data, error } = await supabase
            .from("payroll_entries")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
          
          if (error) {
            if (error.message?.includes("locked")) throw new Error("This payroll period is locked and cannot be edited. Reopen the period first.");
            throw error;
          }
          return data;
        })
      );
      const failures = results.filter(result => result.status === "rejected");
      if (failures.length) {
        throw new Error(`${failures.length} of ${results.length} payroll updates failed. Other rows may have saved; the table will refresh. Review it before retrying.`);
      }
      return results.map(result => (result as PromiseFulfilledResult<PayrollEntry>).value);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_entries", tenantId] });
      invalidateHolidayDerivedQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
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

      // Get source entries with employee status + end_date so we can
      // exclude former employees whose employment ended before the NEW
      // period start and who have no activity in it.
      const { data: sourceEntries, error: entriesError } = await supabase
        .from("payroll_entries")
        .select("*, employees(id, status, end_date, start_date)")
        .eq("payroll_period_id", sourcePeriodId);

      if (entriesError) throw entriesError;

      if (sourceEntries && sourceEntries.length > 0) {
        const newPeriodStart = new Date(startDate);
        const eligibleEntries = sourceEntries.filter((entry: any) => {
          const emp = entry.employees;
          const empStatus = emp?.status;
          if (empStatus === "archived") return false;
          if (empStatus === "leaver") return false;
          // Exclude anyone whose end_date is strictly before the new period start.
          if (emp?.end_date) {
            const endDateVal = new Date(emp.end_date);
            if (!Number.isNaN(endDateVal.getTime()) && endDateVal < newPeriodStart) return false;
          }
          return empStatus === "active" || empStatus === "starter";
        });

        // Phase 2C — prefer active employment terms (as of NEW period start)
        // when seeding the copied entries. Falls back to the previous entry's
        // rate / service_charge if no active terms row exists.
        const { fetchActiveTermsMap, resolveRateSource } = await import(
          "@/lib/payroll-rate-source"
        );
        const termsMap = await fetchActiveTermsMap(
          tenantId!,
          eligibleEntries.map((e: any) => e.employee_id),
          startDate,
        );

        const newEntries = eligibleEntries.map((entry: any) => {
          const defaults = resolveRateSource(termsMap.get(entry.employee_id), {
            id: entry.employee_id,
            hourly_rate: entry.hourly_rate,
            service_charge: entry.service_charge,
          });
          return {
            payroll_period_id: newPeriod.id,
            employee_id: entry.employee_id,
            hourly_rate: defaults.hourly_rate,
            service_charge: defaults.service_charge,
            timesheet_hours: 0,
            imported_hours: null,
            // A bonus belongs to the period it was earned in. Carrying one
            // forward would silently pay it twice, so a copied period always
            // starts at zero and the admin enters any bonus deliberately.
            performance_bonus: 0,
            special_bonus: 0,
            holiday_accrued_hours: 0,
            total_pay: 0,
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
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries", tenantId] });
      invalidateHolidayDerivedQueries(queryClient);
    },
  });
}

export function useDeletePayrollPeriod() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (
      input: string | { id: string; reason?: string; requestId?: string },
    ) => {
      const id = typeof input === "string" ? input : input.id;
      const reason = typeof input === "string" ? null : input.reason?.trim() || null;
      // One id per delete click. Retrying with the same id never deletes twice.
      const requestId =
        (typeof input === "string" ? undefined : input.requestId) || crypto.randomUUID();

      // The only path: one database transaction that checks the period is a
      // draft, snapshots every linked record privately, and removes them
      // together — or changes nothing. There is no browser fallback.
      const { error } = await supabase.rpc(DELETE_RPC as any, {
        _period_id: id,
        _request_id: requestId,
        _reason: reason,
      });
      if (error) throw new Error(describeRecoveryRpcError(error));
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_periods", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries", tenantId] });
      invalidateHolidayDerivedQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["holiday_payments", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_period_delete_impact", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["payroll_period_restorable", tenantId] });
    },
  });
}


export function useMarkBankDetailsExported() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  
  return useMutation({
    mutationFn: async (entryIds: string[]) => {
      await assertPermission("view_pay_data", tenantId!);
      const { error } = await supabase
        .from("payroll_entries")
        .update({ bank_details_exported: true })
        .in("id", entryIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_entries", tenantId] });
      invalidateHolidayDerivedQueries(queryClient);
    },
  });
}