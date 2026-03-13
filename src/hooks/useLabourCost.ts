import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export function useDailyRevenue(date: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["daily_revenue", tenantId, date],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("daily_revenue" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("date", date)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; revenue_amount: number; date: string } | null;
    },
    enabled: !!tenantId && !!date,
  });
}

export function useUpsertDailyRevenue() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, amount }: { date: string; amount: number }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("daily_revenue" as any)
        .upsert(
          { tenant_id: tenantId, date, revenue_amount: amount, created_by: user?.id } as any,
          { onConflict: "tenant_id,date" }
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["daily_revenue", tenantId, vars.date] });
    },
  });
}

export function useTodayLabourCost(date: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["today_labour_cost", tenantId, date],
    queryFn: async () => {
      if (!tenantId) return { totalHours: 0, totalCost: 0, entries: [] };

      // Get today's time entries with employee hourly rates
      const { data: entries, error } = await supabase
        .from("time_entries")
        .select(`
          id, clock_in_time, clock_out_time, total_hours, status,
          employees (id, forename, surname, hourly_rate, department)
        `)
        .gte("clock_in_time", `${date}T00:00:00`)
        .lte("clock_in_time", `${date}T23:59:59`)
        .order("clock_in_time", { ascending: false });

      if (error) throw error;

      let totalHours = 0;
      let totalCost = 0;

      for (const e of entries || []) {
        const hours = e.total_hours || 0;
        const rate = (e.employees as any)?.hourly_rate || 0;
        totalHours += hours;
        totalCost += hours * rate;
      }

      return { totalHours, totalCost, entries: entries || [] };
    },
    enabled: !!tenantId && !!date,
    refetchInterval: 60_000, // refresh every minute
  });
}
