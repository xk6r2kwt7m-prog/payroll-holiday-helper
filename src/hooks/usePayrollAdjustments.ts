import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface PayrollAdjustment {
  id: string;
  payroll_period_id: string;
  payroll_entry_id: string;
  employee_id: string;
  tenant_id: string;
  field_name: string;
  old_value: number | null;
  new_value: number | null;
  delta: number | null;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export function usePayrollAdjustments(periodId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["payroll_adjustments", tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return [];
      const { data, error } = await supabase
        .from("payroll_adjustments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("payroll_period_id", periodId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PayrollAdjustment[];
    },
    enabled: !!tenantId && !!periodId,
  });
}

export function useEmployeeAdjustments(periodId?: string, employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["payroll_adjustments", tenantId, periodId, employeeId],
    queryFn: async () => {
      if (!tenantId || !periodId || !employeeId) return [];
      const { data, error } = await supabase
        .from("payroll_adjustments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("payroll_period_id", periodId)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PayrollAdjustment[];
    },
    enabled: !!tenantId && !!periodId && !!employeeId,
  });
}

/** Check if an employee had adjustments in a previous period (for carry-forward reminder) */
export function usePriorPeriodAdjustments(employeeId?: string, currentPeriodId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["payroll_adjustments_prior", tenantId, employeeId, currentPeriodId],
    queryFn: async () => {
      if (!tenantId || !employeeId || !currentPeriodId) return [];
      // Get the previous period
      const { data: periods } = await supabase
        .from("payroll_periods")
        .select("id")
        .eq("tenant_id", tenantId)
        .order("start_date", { ascending: false })
        .limit(5);
      if (!periods || periods.length < 2) return [];
      const currentIdx = periods.findIndex(p => p.id === currentPeriodId);
      if (currentIdx < 0 || currentIdx >= periods.length - 1) return [];
      const previousPeriodId = periods[currentIdx + 1].id;
      
      const { data, error } = await supabase
        .from("payroll_adjustments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("payroll_period_id", previousPeriodId)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PayrollAdjustment[];
    },
    enabled: !!tenantId && !!employeeId && !!currentPeriodId,
  });
}

export function useCreatePayrollAdjustment() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (adjustments: {
      payroll_period_id: string;
      payroll_entry_id: string;
      employee_id: string;
      field_name: string;
      old_value: number | null;
      new_value: number | null;
      note?: string;
    }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = adjustments.map(a => ({
        ...a,
        tenant_id: tenantId!,
        changed_by: user?.id || null,
      }));
      const { error } = await supabase
        .from("payroll_adjustments")
        .insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_adjustments"] });
    },
  });
}
