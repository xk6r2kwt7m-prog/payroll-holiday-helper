import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/useTenant";

export type Shift = Tables<"shifts">;
export type ShiftInsert = TablesInsert<"shifts">;
export type ShiftUpdate = TablesUpdate<"shifts">;
export type BranchLocation = Tables<"branch_locations">;

export function useBranchLocations() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["branch_locations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("branch_locations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("display_name");
      if (error) throw error;
      return data as BranchLocation[];
    },
    enabled: !!tenantId,
  });
}

export function useShifts(startDate?: string, endDate?: string, branch?: string) {
  return useQuery({
    queryKey: ["shifts", startDate, endDate, branch],
    queryFn: async () => {
      let query = supabase
        .from("shifts")
        .select(`
          *,
          employees (id, forename, surname, department, status)
        `)
        .order("start_time");

      if (startDate) query = query.gte("shift_date", startDate);
      if (endDate) query = query.lte("shift_date", endDate);
      if (branch) query = query.eq("branch", branch as any);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!startDate,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (shift: Omit<ShiftInsert, 'tenant_id'>) => {
      const { data, error } = await supabase
        .from("shifts")
        .insert({ ...shift, tenant_id: tenantId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ShiftUpdate }) => {
      const { data, error } = await supabase
        .from("shifts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useBulkCreateShifts() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (shifts: Omit<ShiftInsert, 'tenant_id'>[]) => {
      const withTenant = shifts.map(s => ({ ...s, tenant_id: tenantId! }));
      const { data, error } = await supabase
        .from("shifts")
        .insert(withTenant as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useBulkDeleteShifts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shiftIds: string[]) => {
      const { error } = await supabase
        .from("shifts")
        .delete()
        .in("id", shiftIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useBulkUpdateShifts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftIds, updates }: { shiftIds: string[]; updates: ShiftUpdate }) => {
      const { error } = await supabase
        .from("shifts")
        .update(updates)
        .in("id", shiftIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function usePublishWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ startDate, endDate, branch, userId }: { startDate: string; endDate: string; branch: string; userId?: string }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("shifts")
        .update({ is_published: true, published_at: now, published_by: userId || null } as any)
        .eq("branch", branch as any)
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .eq("is_published", false)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useUnpublishWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ startDate, endDate, branch }: { startDate: string; endDate: string; branch: string }) => {
      const { data, error } = await supabase
        .from("shifts")
        .update({ is_published: false, published_at: null } as any)
        .eq("branch", branch as any)
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useCopyPreviousWeek() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      prevStartDate,
      prevEndDate,
      targetWeekStart,
      branch,
      department,
    }: {
      prevStartDate: string;
      prevEndDate: string;
      targetWeekStart: string;
      branch: string;
      department: string;
    }) => {
      const { data: prevShifts, error: fetchErr } = await supabase
        .from("shifts")
        .select("*")
        .eq("branch", branch as any)
        .eq("department", department as any)
        .gte("shift_date", prevStartDate)
        .lte("shift_date", prevEndDate);
      if (fetchErr) throw fetchErr;
      if (!prevShifts?.length) throw new Error("No shifts found in previous week");

      const { data: { user } } = await supabase.auth.getUser();

      const prevStart = new Date(prevStartDate + "T00:00:00");
      const targetStart = new Date(targetWeekStart + "T00:00:00");

      const newShifts = prevShifts.map((s: any) => {
        const shiftDate = new Date(s.shift_date + "T00:00:00");
        const dayOffset = Math.round((shiftDate.getTime() - prevStart.getTime()) / (24 * 60 * 60 * 1000));
        const newDate = new Date(targetStart);
        newDate.setDate(newDate.getDate() + dayOffset);

        return {
          shift_date: newDate.toISOString().slice(0, 10),
          branch: s.branch,
          department: s.department,
          employee_id: s.employee_id,
          start_time: s.start_time,
          end_time: s.end_time,
          notes: s.notes,
          status: s.employee_id ? "scheduled" : "open",
          is_published: false,
          created_by: user?.id || null,
          tenant_id: tenantId!,
        };
      });

      const { data, error } = await supabase.from("shifts").insert(newShifts as any).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useLoadTemplate() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      templateId,
      targetWeekStart,
      branch,
      department,
    }: {
      templateId: string;
      targetWeekStart: string;
      branch: string;
      department: string;
    }) => {
      const { data: templateShifts, error: fetchErr } = await supabase
        .from("schedule_template_shifts")
        .select("*")
        .eq("template_id", templateId);
      if (fetchErr) throw fetchErr;
      if (!templateShifts?.length) throw new Error("Template has no shifts");

      const { data: { user } } = await supabase.auth.getUser();
      const targetStart = new Date(targetWeekStart + "T00:00:00");

      const newShifts = (templateShifts as any[]).map((ts) => {
        const newDate = new Date(targetStart);
        newDate.setDate(newDate.getDate() + ts.day_of_week);

        return {
          shift_date: newDate.toISOString().slice(0, 10),
          branch: branch,
          department: department,
          employee_id: ts.employee_id,
          start_time: ts.start_time,
          end_time: ts.end_time,
          notes: ts.notes,
          status: ts.employee_id ? "scheduled" : "open",
          is_published: false,
          created_by: user?.id || null,
          tenant_id: tenantId!,
        };
      });

      const { data, error } = await supabase.from("shifts").insert(newShifts as any).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}
