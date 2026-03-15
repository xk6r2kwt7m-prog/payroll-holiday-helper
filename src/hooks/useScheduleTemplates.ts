import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assertPermission } from "@/lib/permission-guard";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export interface ScheduleTemplate {
  id: string;
  name: string;
  branch: string;
  department: string;
  created_by: string | null;
  created_at: string;
}

export interface ScheduleTemplateShift {
  id: string;
  template_id: string;
  day_of_week: number;
  employee_id: string | null;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export function useScheduleTemplates(branch?: string, department?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["schedule_templates", tenantId, branch, department],
    queryFn: async () => {
      if (!tenantId) return [] as ScheduleTemplate[];
      let query = supabase
        .from("schedule_templates")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (branch) query = query.eq("branch", branch);
      if (department) query = query.eq("department", department);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ScheduleTemplate[];
    },
    enabled: !!tenantId,
  });
}

export function useScheduleTemplateShifts(templateId?: string) {
  return useQuery({
    queryKey: ["schedule_template_shifts", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_template_shifts")
        .select("*")
        .eq("template_id", templateId!)
        .order("day_of_week");
      if (error) throw error;
      return data as unknown as ScheduleTemplateShift[];
    },
    enabled: !!templateId,
  });
}

export function useSaveScheduleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      branch,
      department,
      shifts,
    }: {
      name: string;
      branch: string;
      department: string;
      shifts: { day_of_week: number; employee_id: string | null; start_time: string; end_time: string; notes: string | null }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Create template
      const { data: template, error: tErr } = await supabase
        .from("schedule_templates")
        .insert({ name, branch, department, created_by: user?.id } as any)
        .select()
        .single();
      if (tErr) throw tErr;

      // Insert template shifts
      if (shifts.length > 0) {
        const rows = shifts.map((s) => ({
          template_id: (template as any).id,
          day_of_week: s.day_of_week,
          employee_id: s.employee_id,
          start_time: s.start_time,
          end_time: s.end_time,
          notes: s.notes,
        }));
        const { error: sErr } = await supabase
          .from("schedule_template_shifts")
          .insert(rows as any);
        if (sErr) throw sErr;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_templates"] });
      toast.success("Template saved");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteScheduleTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      await assertPermission("edit_schedules", tenantId!);
      const { error } = await supabase.from("schedule_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_templates"] });
      toast.success("Template deleted");
    },
    onError: (err) => toast.error(err.message),
  });
}
