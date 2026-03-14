import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";

export interface ReturnToWorkForm {
  id: string;
  absence_record_id: string;
  employee_id: string;
  completed_by: string | null;
  completed_at: string | null;
  fit_to_return: boolean;
  reason_for_absence: string | null;
  doctor_consulted: boolean;
  doctor_note_provided: boolean;
  adjustments_needed: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  manager_comments: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  employees?: { forename: string; surname: string; department: string };
}

export function useReturnToWorkForms(employeeId?: string) {
  return useQuery({
    queryKey: ["return_to_work_forms", employeeId],
    queryFn: async () => {
      let q = supabase
        .from("return_to_work_forms" as any)
        .select("*, employees(forename, surname, department)")
        .order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ReturnToWorkForm[];
    },
  });
}

export function useCreateRTWForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: {
      absence_record_id: string;
      employee_id: string;
      fit_to_return: boolean;
      reason_for_absence?: string;
      doctor_consulted?: boolean;
      doctor_note_provided?: boolean;
      adjustments_needed?: string;
      follow_up_required?: boolean;
      follow_up_date?: string;
      follow_up_notes?: string;
      manager_comments?: string;
    }) => {
      const { error } = await supabase
        .from("return_to_work_forms" as any)
        .insert({
          ...form,
          status: "completed",
          completed_at: new Date().toISOString(),
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["return_to_work_forms"] });
      toast.success("Return-to-work form saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
