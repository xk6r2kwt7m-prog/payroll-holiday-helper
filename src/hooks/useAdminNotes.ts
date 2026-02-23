import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminNote {
  id: string;
  employee_id: string;
  payroll_period_id: string | null;
  note: string;
  status: "open" | "resolved";
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  payroll_periods?: { period_name: string } | null;
}

export function useAdminNotes(employeeId?: string) {
  return useQuery({
    queryKey: ["admin_notes", employeeId],
    queryFn: async () => {
      let query = supabase
        .from("admin_notes" as any)
        .select("*, payroll_periods(period_name)")
        .order("created_at", { ascending: false });

      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AdminNote[];
    },
    enabled: !!employeeId,
  });
}

export function useCreateAdminNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: {
      employee_id: string;
      note: string;
      payroll_period_id?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("admin_notes" as any)
        .insert({
          employee_id: note.employee_id,
          note: note.note,
          payroll_period_id: note.payroll_period_id || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin_notes", variables.employee_id] });
      queryClient.invalidateQueries({ queryKey: ["admin_notes"] });
    },
  });
}

export function useResolveAdminNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase
        .from("admin_notes" as any)
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      return { id, employeeId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin_notes", variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ["admin_notes"] });
    },
  });
}

export function useDeleteAdminNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase
        .from("admin_notes" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, employeeId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin_notes", variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ["admin_notes"] });
    },
  });
}
