import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export function useShiftAlerts(date?: string, resolvedFilter?: boolean) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["shift_alerts", tenantId, date, resolvedFilter],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from("shift_alerts" as any)
        .select(`
          *,
          employees (id, forename, surname, department)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (date) {
        query = query.gte("created_at", `${date}T00:00:00`).lte("created_at", `${date}T23:59:59`);
      }
      if (resolvedFilter !== undefined) {
        query = query.eq("resolved", resolvedFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
}

export function useResolveShiftAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("shift_alerts" as any)
        .update({
          resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution_note: note || null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift_alerts"] });
    },
  });
}

export function useCreateShiftAlerts() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alerts: Array<{
      employee_id: string;
      shift_id?: string | null;
      time_entry_id?: string | null;
      alert_type: string;
      alert_message: string;
    }>) => {
      if (!tenantId || alerts.length === 0) return;
      const rows = alerts.map((a) => ({
        tenant_id: tenantId,
        employee_id: a.employee_id,
        shift_id: a.shift_id || null,
        time_entry_id: a.time_entry_id || null,
        alert_type: a.alert_type,
        alert_message: a.alert_message,
      }));
      const { error } = await supabase
        .from("shift_alerts" as any)
        .insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift_alerts"] });
    },
  });
}
