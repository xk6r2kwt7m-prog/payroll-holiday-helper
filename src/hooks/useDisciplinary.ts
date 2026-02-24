import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DisciplinaryRecord {
  id: string;
  employee_id: string;
  record_type: string;
  category: string;
  incident_date: string;
  description: string;
  witnesses: string | null;
  meeting_date: string | null;
  meeting_notes: string | null;
  outcome: string | null;
  appeal_deadline: string | null;
  appeal_received: boolean;
  appeal_outcome: string | null;
  expiry_date: string | null;
  status: string;
  issued_by: string | null;
  created_at: string;
  updated_at: string;
  employees?: { forename: string; surname: string; department: string };
}

export const RECORD_TYPES = [
  { value: "disciplinary", label: "Disciplinary" },
  { value: "grievance", label: "Grievance" },
];

export const CATEGORIES = [
  { value: "verbal_warning", label: "Verbal Warning" },
  { value: "written_warning", label: "Written Warning" },
  { value: "final_warning", label: "Final Written Warning" },
  { value: "dismissal", label: "Dismissal" },
  { value: "investigation", label: "Investigation" },
  { value: "grievance_raised", label: "Grievance Raised" },
  { value: "grievance_resolved", label: "Grievance Resolved" },
];

export function useDisciplinaryRecords(employeeId?: string) {
  return useQuery({
    queryKey: ["disciplinary_records", employeeId],
    queryFn: async () => {
      let q = supabase
        .from("disciplinary_records" as any)
        .select("*, employees(forename, surname, department)")
        .order("incident_date", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as DisciplinaryRecord[];
    },
  });
}

export function useAddDisciplinaryRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      employee_id: string;
      record_type: string;
      category: string;
      incident_date: string;
      description: string;
      witnesses?: string;
      meeting_date?: string;
      meeting_notes?: string;
      outcome?: string;
      appeal_deadline?: string;
      expiry_date?: string;
    }) => {
      const { error } = await supabase.from("disciplinary_records" as any).insert(record as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disciplinary_records"] });
      toast.success("Record added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateDisciplinaryRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("disciplinary_records" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disciplinary_records"] });
      toast.success("Record updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
