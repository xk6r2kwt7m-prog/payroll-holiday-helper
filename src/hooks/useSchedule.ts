import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Shift = Tables<"shifts">;
export type ShiftInsert = TablesInsert<"shifts">;
export type ShiftUpdate = TablesUpdate<"shifts">;
export type BranchLocation = Tables<"branch_locations">;

export function useBranchLocations() {
  return useQuery({
    queryKey: ["branch_locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_locations")
        .select("*")
        .order("display_name");
      if (error) throw error;
      return data as BranchLocation[];
    },
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
  return useMutation({
    mutationFn: async (shift: ShiftInsert) => {
      const { data, error } = await supabase
        .from("shifts")
        .insert(shift)
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
  return useMutation({
    mutationFn: async (shifts: ShiftInsert[]) => {
      const { data, error } = await supabase
        .from("shifts")
        .insert(shifts)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function usePublishWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ startDate, endDate, branch }: { startDate: string; endDate: string; branch: string }) => {
      const { data, error } = await supabase
        .from("shifts")
        .update({ is_published: true, published_at: new Date().toISOString() } as any)
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
