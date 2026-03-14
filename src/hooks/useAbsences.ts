import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";

export interface AbsenceRecord {
  id: string;
  employee_id: string;
  absence_type: string;
  start_date: string;
  end_date: string;
  hours: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  employees?: { forename: string; surname: string; department: string };
}

export function useAbsenceRecords(employeeId?: string) {
  return useQuery({
    queryKey: ["absence_records", employeeId],
    queryFn: async () => {
      let q = supabase
        .from("absence_records" as any)
        .select("*, employees(forename, surname, department)")
        .order("start_date", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as AbsenceRecord[];
    },
  });
}

export function useAddAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      employee_id: string;
      absence_type: string;
      start_date: string;
      end_date: string;
      hours: number;
      notes?: string;
    }) => {
      await assertPermission("edit_employees", null);
      const { error } = await supabase.from("absence_records" as any).insert(record as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absence_records"] });
      toast.success("Absence recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("edit_employees", null);
      const { error } = await supabase.from("absence_records" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absence_records"] });
      toast.success("Absence deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// Bradford Factor = S² × D
// S = number of separate absence spells in rolling 52 weeks
// D = total days absent in rolling 52 weeks
export function calculateBradfordFactor(absences: AbsenceRecord[]): number {
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const recentAbsences = absences.filter((a) => {
    const start = new Date(a.start_date);
    return start >= yearAgo && start <= now;
  });

  const spells = recentAbsences.length; // S
  const totalDays = recentAbsences.reduce((sum, a) => {
    const start = new Date(a.start_date);
    const end = new Date(a.end_date);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return sum + days;
  }, 0); // D

  return spells * spells * totalDays;
}

export function getBradfordLevel(score: number): { label: string; color: string } {
  if (score === 0) return { label: "Excellent", color: "text-success" };
  if (score <= 50) return { label: "Low", color: "text-success" };
  if (score <= 124) return { label: "Moderate", color: "text-warning" };
  if (score <= 399) return { label: "Concern", color: "text-warning" };
  return { label: "Critical", color: "text-destructive" };
}
