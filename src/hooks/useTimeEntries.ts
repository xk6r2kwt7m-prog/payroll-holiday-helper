import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { useTenant } from "@/hooks/useTenant";
import { assertPermission } from "@/lib/permission-guard";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { assertTimesheetHistoryReady } from "@/lib/timesheet-history-guard";

export type TimeEntry = Tables<"time_entries">;
export type TimeEntryUpdate = TablesUpdate<"time_entries">;

export function useTimeEntries(
  startDate?: string,
  endDate?: string,
  status?: string,
  branch?: string
) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["time_entries", tenantId, startDate, endDate, status, branch],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from("time_entries")
        .select(`
          *,
          employees (id, forename, surname, department, status),
          shifts (id, start_time, end_time, shift_date)
        `)
        .eq("tenant_id", tenantId)
        .order("clock_in_time", { ascending: false });

      if (startDate) query = query.gte("clock_in_time", `${startDate}T00:00:00`);
      if (endDate) query = query.lte("clock_in_time", `${endDate}T23:59:59`);
      if (status) query = query.eq("status", status as any);
      if (branch) query = query.eq("branch", branch as any);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

/** Own time entries only: scoped to the signed-in employee in the active workspace. */
export function useMyTimeEntries() {
  const { employee } = useCurrentEmployee();
  const employeeId = employee?.id ?? null;
  const tenantId = employee?.tenant_id ?? null;
  return useQuery({
    queryKey: ["my_time_entries", tenantId, employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`*, shifts (id, start_time, end_time, shift_date)`)
        .eq("employee_id", employeeId!)
        .eq("tenant_id", tenantId!)
        .order("clock_in_time", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && !!tenantId,
  });
}

export class ActiveClockInConflictError extends Error {
  constructor() {
    super("More than one open clock-in was found for you. Ask a manager to review your timesheet.");
    this.name = "ActiveClockInConflictError";
  }
}

/** Own open clock-in only. More than one open entry is reported, not guessed. */
export function useActiveClockIn() {
  const { employee } = useCurrentEmployee();
  const employeeId = employee?.id ?? null;
  const tenantId = employee?.tenant_id ?? null;
  return useQuery({
    queryKey: ["active_clock_in", tenantId, employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("employee_id", employeeId!)
        .eq("tenant_id", tenantId!)
        .eq("status", "clocked_in")
        .order("clock_in_time", { ascending: false })
        .limit(2);
      if (error) throw error;
      if ((data?.length ?? 0) > 1) throw new ActiveClockInConflictError();
      return (data?.[0] as TimeEntry | undefined) ?? null;
    },
    enabled: !!employeeId && !!tenantId,
    retry: (count, err) => !(err instanceof ActiveClockInConflictError) && count < 2,
    refetchInterval: 30000,
  });
}

export function useClockInOut() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (body: {
      action: "clock_in" | "clock_out";
      latitude?: number;
      longitude?: number;
      branch?: string;
      shift_id?: string;
      notes?: string;
      break_minutes?: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // tenant_id tells the server which workspace's employee record to use;
      // the server verifies it against the signed-in user's own records.
      const response = await supabase.functions.invoke("clock-in-out", {
        body: { ...body, tenant_id: tenantId ?? undefined },
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

export function useUpdateBreakMinutes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, breakMinutes }: { entryId: string; breakMinutes: number }) => {
      const { error } = await supabase
        .from("time_entries")
        .update({ break_minutes: Math.round(Math.max(0, breakMinutes)) })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active_clock_in"] });
      queryClient.invalidateQueries({ queryKey: ["my_time_entries"] });
    },
  });
}

export function useManagerAddTimeEntry() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      employeeId,
      branch,
      clockInTime,
      clockOutTime,
      breakMinutes,
      reason,
    }: {
      employeeId: string;
      branch: string;
      clockInTime: string;
      clockOutTime?: string;
      breakMinutes: number;
      reason: string;
    }) => {
      await assertPermission("approve_timesheets", tenantId!);
      await assertTimesheetHistoryReady();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: employee } = await supabase
        .from("employees")
        .select("department")
        .eq("id", employeeId)
        .single();

      if (clockOutTime && new Date(clockOutTime) <= new Date(clockInTime)) {
        throw new Error("Clock-out time must be after clock-in time");
      }

      const insertData: Record<string, any> = {
        employee_id: employeeId,
        tenant_id: tenantId!,
        branch,
        department: employee?.department || "unknown",
        clock_in_time: clockInTime,
        clock_in_within_geofence: false,
        status: clockOutTime ? "pending" : "clocked_in",
        manager_adjusted: true,
        adjustment_reason: reason,
        adjusted_by: user.id,
        manager_override: true,
        override_reason: reason,
        break_minutes: breakMinutes,
      };
      if (clockOutTime) {
        insertData.clock_out_time = clockOutTime;
        insertData.clock_out_within_geofence = false;
      }

      const { data, error } = await supabase
        .from("time_entries")
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") throw new Error("Employee already has an active clock-in.");
        throw error;
      }

      // Database trigger writes the history row in this insert's transaction.
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["active_clock_in"] });
    },
  });
}

export function useManagerEditTimeEntry() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      entryId,
      updates,
      reason,
    }: {
      entryId: string;
      updates: Record<string, any>;
      reason: string;
    }) => {
      await assertPermission("approve_timesheets", tenantId!);
      await assertTimesheetHistoryReady();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (updates.clock_out_time && updates.clock_in_time && new Date(updates.clock_out_time) <= new Date(updates.clock_in_time)) {
        throw new Error("Clock-out time must be after clock-in time");
      }

      const { data, error } = await supabase
        .from("time_entries")
        .update({
          ...updates,
          manager_adjusted: true,
          adjustment_reason: reason,
          adjusted_by: user.id,
        } as any)
        .eq("id", entryId)
        .select()
        .single();

      if (error) throw error;

      // Database trigger writes old and new values in this update's transaction.
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["active_clock_in"] });
      queryClient.invalidateQueries({ queryKey: ["my_time_entries"] });
    },
  });
}

export function useApproveTimeEntries() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      entryIds,
      mode = "approve_single",
      reviewReason,
    }: {
      entryIds: string[];
      mode?: "approve_single" | "approve_batch_selected" | "approve_batch_daily";
      reviewReason?: string;
    }) => {
      await assertPermission("approve_timesheets", tenantId!);
      await assertTimesheetHistoryReady();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("time_entries")
        .update({
          status: "approved" as const,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_mode: mode,
          approval_review_reason: reviewReason?.trim() || null,
        } as any)
        .in("id", entryIds);
      if (error) throw error;
      // The database trigger records each approval atomically with this update.
      return { approved: entryIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
    },
  });
}

export function useRejectTimeEntry() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      await assertPermission("approve_timesheets", tenantId!);
      await assertTimesheetHistoryReady();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("time_entries")
        .update({ status: "rejected" as const, notes })
        .eq("id", id);
      if (error) throw error;

      // The database trigger records the rejection atomically with this update.
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
      await assertPermission("approve_timesheets", tenantId);
      await assertTimesheetHistoryReady();
      const { data: employee } = await supabase
        .from("employees")
        .select("department")
        .eq("id", employeeId)
        .single();

      if (action === "clock_in") {
        // Check for existing open clock-in before creating a new one
        const { data: existingOpen } = await supabase
          .from("time_entries")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("status", "clocked_in")
          .maybeSingle();

        if (existingOpen) {
          throw new Error("Employee already has an active clock-in. Clock them out first.");
        }

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
        if (error) {
          // Handle duplicate constraint at DB level too
          if (error.code === "23505") {
            throw new Error("Employee already has an active clock-in. Clock them out first.");
          }
          throw error;
        }
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
