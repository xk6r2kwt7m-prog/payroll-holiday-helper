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
      return data as unknown as { id: string; revenue_amount: number; date: string } | null;
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
      if (!tenantId) return { totalHours: 0, totalCost: 0, baseCost: 0, scCost: 0, fallbackCount: 0, entries: [] };

      const { data: entries, error } = await supabase
        .from("time_entries")
        .select(`
          id, clock_in_time, clock_out_time, total_hours, status, employee_id,
          employees (id, forename, surname, hourly_rate, service_charge, department)
        `)
        .eq("tenant_id", tenantId)
        .gte("clock_in_time", `${date}T00:00:00`)
        .lte("clock_in_time", `${date}T23:59:59`)
        .order("clock_in_time", { ascending: false });
      if (error) throw error;

      // Phase 3: pull active employment terms as of `date` for cost split.
      const empIds = Array.from(new Set((entries ?? []).map((e: any) => e.employee_id).filter(Boolean)));
      let termsByEmp = new Map<string, any>();
      if (empIds.length > 0) {
        const { data: termsRows } = await supabase
          .from("employee_contract_terms")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("employee_id", empIds)
          .lte("effective_from", date)
          .or(`effective_to.is.null,effective_to.gt.${date}`)
          .in("status", ["active", "superseded"])
          .order("effective_from", { ascending: false });
        for (const t of (termsRows ?? []) as any[]) {
          if (!termsByEmp.has(t.employee_id)) termsByEmp.set(t.employee_id, t);
        }
      }

      let totalHours = 0;
      let baseCost = 0;
      let scCost = 0;
      let fallbackCount = 0;

      for (const e of entries || []) {
        const hours = e.total_hours || 0;
        const emp: any = e.employees || {};
        const terms = termsByEmp.get(e.employee_id);
        const baseRate = terms
          ? Number(terms.base_hourly_rate ?? terms.hourly_rate ?? 0)
          : Number(emp.hourly_rate || 0);
        const scRate = terms
          ? Number(terms.guaranteed_service_charge_rate ?? 0)
          : Number(emp.service_charge || 0);
        if (!terms) fallbackCount += 1;
        totalHours += hours;
        baseCost += hours * baseRate;
        scCost += hours * scRate;
      }

      const totalCost = baseCost + scCost;
      return { totalHours, totalCost, baseCost, scCost, fallbackCount, entries: entries || [] };
    },
    enabled: !!tenantId && !!date,
    refetchInterval: 60_000,
  });
}
