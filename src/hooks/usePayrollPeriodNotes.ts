import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface PayrollPeriodNote {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  tenant_id: string;
  note: string;
  category: string | null;
  show_on_pdf: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePayrollPeriodNotes(periodId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["payroll_period_notes", tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return [];
      const { data, error } = await supabase
        .from("payroll_period_notes")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("payroll_period_id", periodId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PayrollPeriodNote[];
    },
    enabled: !!tenantId && !!periodId,
  });
}

export function useCreatePayrollPeriodNote() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (params: {
      payroll_period_id: string;
      employee_id: string;
      note: string;
      category?: string | null;
      show_on_pdf?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("payroll_period_notes")
        .insert({
          payroll_period_id: params.payroll_period_id,
          employee_id: params.employee_id,
          note: params.note,
          category: params.category ?? null,
          show_on_pdf: params.show_on_pdf ?? false,
          tenant_id: tenantId!,
          created_by: user?.id || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_period_notes"] });
    },
  });
}

export function useDeletePayrollPeriodNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payroll_period_notes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_period_notes"] });
    },
  });
}

/** Toggle just the PDF visibility on an existing note. Does not modify text. */
export function useUpdatePayrollPeriodNoteVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; show_on_pdf: boolean }) => {
      const { error } = await supabase
        .from("payroll_period_notes")
        .update({ show_on_pdf: params.show_on_pdf } as any)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_period_notes"] });
    },
  });
}
