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
  scope: "department" | "site";
  is_archived: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ScheduleTemplateShift {
  id: string;
  template_id: string;
  day_of_week: number;
  employee_id: string | null;
  start_time: string;
  end_time: string;
  notes: string | null;
  department: string | null;
  role: string | null;
  required_headcount: number;
  break_minutes: number | null;
}

interface UseScheduleTemplatesOptions {
  includeArchived?: boolean;
}

export function useScheduleTemplates(
  branch?: string,
  department?: string,
  options: UseScheduleTemplatesOptions = {}
) {
  const { tenantId } = useTenant();
  const { includeArchived = false } = options;
  return useQuery({
    queryKey: ["schedule_templates", tenantId, branch, department, includeArchived],
    queryFn: async () => {
      if (!tenantId) return [] as ScheduleTemplate[];
      let query = supabase
        .from("schedule_templates")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (branch) query = query.eq("branch", branch);
      if (department) query = query.eq("department", department);
      if (!includeArchived) query = query.eq("is_archived", false);
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

export interface SaveTemplateShiftInput {
  day_of_week: number;
  employee_id: string | null;
  start_time: string;
  end_time: string;
  notes: string | null;
  department?: string | null;
  role?: string | null;
  required_headcount?: number;
  break_minutes?: number | null;
}

export function useSaveScheduleTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      name,
      branch,
      department,
      scope = "department",
      shifts,
    }: {
      name: string;
      branch: string;
      department: string;
      scope?: "department" | "site";
      shifts: SaveTemplateShiftInput[];
    }) => {
      await assertPermission("edit_schedules", tenantId!);
      const { data: { user } } = await supabase.auth.getUser();

      const { data: template, error: tErr } = await supabase
        .from("schedule_templates")
        .insert({ name, branch, department, scope, tenant_id: tenantId!, created_by: user?.id } as any)
        .select()
        .single();
      if (tErr) throw tErr;

      if (shifts.length > 0) {
        const rows = shifts.map((s) => ({
          template_id: (template as any).id,
          tenant_id: tenantId!,
          day_of_week: s.day_of_week,
          employee_id: s.employee_id,
          start_time: s.start_time,
          end_time: s.end_time,
          notes: s.notes,
          department: s.department ?? null,
          role: s.role ?? null,
          required_headcount: s.required_headcount ?? 1,
          break_minutes: s.break_minutes ?? null,
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

export function useUpdateScheduleTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<ScheduleTemplate, "name" | "branch" | "department" | "scope">>;
    }) => {
      await assertPermission("edit_schedules", tenantId!);
      const { error } = await supabase
        .from("schedule_templates")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_templates"] });
      toast.success("Template updated");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useArchiveScheduleTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      await assertPermission("edit_schedules", tenantId!);
      const { error } = await supabase
        .from("schedule_templates")
        .update({ is_archived: archived, is_default: archived ? false : undefined } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["schedule_templates"] });
      toast.success(vars.archived ? "Template archived" : "Template restored");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useSetDefaultScheduleTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ id, branch, department }: { id: string; branch: string; department: string }) => {
      await assertPermission("edit_schedules", tenantId!);
      // Clear other defaults in same scope first (unique partial index will enforce too)
      const { error: clearErr } = await supabase
        .from("schedule_templates")
        .update({ is_default: false } as any)
        .eq("tenant_id", tenantId!)
        .eq("branch", branch)
        .eq("department", department)
        .neq("id", id);
      if (clearErr) throw clearErr;
      const { error } = await supabase
        .from("schedule_templates")
        .update({ is_default: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_templates"] });
      toast.success("Default template set");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDuplicateScheduleTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName?: string }) => {
      await assertPermission("edit_schedules", tenantId!);
      const { data: src, error: srcErr } = await supabase
        .from("schedule_templates")
        .select("*")
        .eq("id", id)
        .single();
      if (srcErr) throw srcErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { data: copy, error: insErr } = await supabase
        .from("schedule_templates")
        .insert({
          name: newName || `${(src as any).name} (copy)`,
          branch: (src as any).branch,
          department: (src as any).department,
          scope: (src as any).scope,
          tenant_id: tenantId!,
          created_by: user?.id || null,
        } as any)
        .select()
        .single();
      if (insErr) throw insErr;

      const { data: shifts, error: shErr } = await supabase
        .from("schedule_template_shifts")
        .select("*")
        .eq("template_id", id);
      if (shErr) throw shErr;
      if (shifts && shifts.length > 0) {
        const rows = (shifts as any[]).map((s) => ({
          template_id: (copy as any).id,
          tenant_id: tenantId!,
          day_of_week: s.day_of_week,
          employee_id: s.employee_id,
          start_time: s.start_time,
          end_time: s.end_time,
          notes: s.notes,
          department: s.department,
          role: s.role,
          required_headcount: s.required_headcount ?? 1,
          break_minutes: s.break_minutes,
        }));
        const { error: insSh } = await supabase.from("schedule_template_shifts").insert(rows as any);
        if (insSh) throw insSh;
      }
      return copy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_templates"] });
      toast.success("Template duplicated");
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
