import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/useTenant";

export type TimeEntry = Tables<"time_entries">;
export type TimeEntryUpdate = TablesUpdate<"time_entries">;

export function useTimeEntries(
  startDate?: string,
  endDate?: string,
  status?: string,
  branch?: string
) {
  return useQuery({
    queryKey: ["time_entries", startDate, endDate, status, branch],
    queryFn: async () => {
      let query = supabase
        .from("time_entries")
        .select(`
          *,
          employees (id, forename, surname, department, status),
          shifts (id, start_time, end_time, shift_date)
        `)
        .order("clock_in_time", { ascending: false });

      if (startDate) query = query.gte("clock_in_time", `${startDate}T00:00:00`);
      if (endDate) query = query.lte("clock_in_time", `${endDate}T23:59:59`);
      if (status) query = query.eq("status", status as any);
      if (branch) query = query.eq("branch", branch as any);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useMyTimeEntries() {
  return useQuery({
    queryKey: ["my_time_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`*, shifts (id, start_time, end_time, shift_date)`)
        .order("clock_in_time", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveClockIn() {
  return useQuery({
    queryKey: ["active_clock_in"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("status", "clocked_in")
        .maybeSingle();
      if (error) throw error;
      return data as TimeEntry | null;
    },
    refetchInterval: 30000, // refresh every 30s
  });
}

export function useClockInOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      action: "clock_in" | "clock_out";
      latitude?: number;
      longitude?: number;
      branch?: string;
      shift_id?: string;
      notes?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("clock-in-out", {
        body,
      });

      if (response.error) {
        throw new Error(response.error.message || "Clock-in/out failed");
      }

      const result = response.data;
      if (result.error) {
        const err = new Error(result.error) as any;
        err.requires_override = result.requires_override;
        err.within_geofence = result.within_geofence;
        throw err;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active_clock_in"] });
      queryClient.invalidateQueries({ queryKey: ["my_time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
    },
  });
}

export function useApproveTimeEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("time_entries")
        .update({
          status: "approved" as const,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .in("id", entryIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
    },
  });
}

export function useRejectTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from("time_entries")
        .update({ status: "rejected" as const, notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
    },
  });
}

export function useManagerOverride() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      employeeId,
      action,
      branch,
      reason,
    }: {
      employeeId: string;
      action: "clock_in" | "clock_out";
      branch: string;
      reason: string;
    }) => {
      const { data: employee } = await supabase
        .from("employees")
        .select("department")
        .eq("id", employeeId)
        .single();

      if (action === "clock_in") {
        const { data, error } = await supabase
          .from("time_entries")
          .insert({
            employee_id: employeeId,
            branch: branch as any,
            department: employee!.department,
            clock_in_time: new Date().toISOString(),
            clock_in_within_geofence: false,
            manager_override: true,
            override_reason: reason,
            status: "clocked_in" as const,
            tenant_id: tenantId!,
          } as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data: active } = await supabase
          .from("time_entries")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("status", "clocked_in")
          .maybeSingle();

        if (!active) throw new Error("No active clock-in found");

        const { data, error } = await supabase
          .from("time_entries")
          .update({
            clock_out_time: new Date().toISOString(),
            clock_out_within_geofence: false,
            manager_override: true,
            override_reason: reason,
          })
          .eq("id", active.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["active_clock_in"] });
    },
  });
}
