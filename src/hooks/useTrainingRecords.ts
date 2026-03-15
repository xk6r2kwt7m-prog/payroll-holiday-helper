import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { assertPermission } from "@/lib/permission-guard";
import { useTenant } from "@/hooks/useTenant";

export interface TrainingRecord {
  id: string;
  employee_id: string;
  certification_name: string;
  certification_type: string;
  provider: string | null;
  date_obtained: string;
  expiry_date: string | null;
  certificate_file_path: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  employees?: { forename: string; surname: string; department: string };
}

export const CERTIFICATION_TYPES = [
  { value: "food_hygiene", label: "Food Hygiene (L2)" },
  { value: "food_hygiene_l3", label: "Food Hygiene (L3)" },
  { value: "first_aid", label: "First Aid" },
  { value: "fire_safety", label: "Fire Safety" },
  { value: "manual_handling", label: "Manual Handling" },
  { value: "allergen_awareness", label: "Allergen Awareness" },
  { value: "coshh", label: "COSHH" },
  { value: "dbs_check", label: "DBS Check" },
  { value: "personal_licence", label: "Personal Licence" },
  { value: "health_safety", label: "Health & Safety" },
  { value: "other", label: "Other" },
];

export function useTrainingRecords(employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["training_records", tenantId, employeeId],
    queryFn: async () => {
      if (!tenantId) return [] as TrainingRecord[];
      let q = supabase
        .from("training_records" as any)
        .select("*, employees(forename, surname, department)")
        .eq("tenant_id", tenantId)
        .order("expiry_date", { ascending: true });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as TrainingRecord[];
    },
    enabled: !!tenantId,
  });
}

export function useAddTrainingRecord() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (record: {
      employee_id: string;
      certification_name: string;
      certification_type: string;
      provider?: string;
      date_obtained: string;
      expiry_date?: string;
      notes?: string;
    }) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase.from("training_records" as any).insert(record as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_records"] });
      toast.success("Training record added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTrainingRecord() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("manage_training", tenantId!);
      const { error } = await supabase.from("training_records" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_records"] });
      toast.success("Training record deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
