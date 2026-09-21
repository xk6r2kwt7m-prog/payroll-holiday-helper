/**
 * Contracted pay rates taken from each employee's ACTIVE employment terms.
 *
 * Used as a read-only fallback when a staff record carries no hourly rate, so a
 * timesheet import can never write £0.00 for somebody whose contract states a
 * rate. Never writes, never overrides a rate that is already on the record.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface ContractedRate {
  hourly_rate: number;
  service_charge: number;
}

export function useContractedRates() {
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["contracted_rates", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_contract_terms")
        .select(
          "employee_id, hourly_rate, base_hourly_rate, estimated_service_charge_rate, guaranteed_service_charge_rate, effective_from",
        )
        .eq("tenant_id", tenantId!)
        .eq("status", "active")
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const rateByEmployee = useMemo(() => {
    const map = new Map<string, ContractedRate>();
    for (const row of query.data ?? []) {
      const r = row as any;
      const rate = Number(r.base_hourly_rate ?? 0) || Number(r.hourly_rate ?? 0) || 0;
      if (rate <= 0) continue;
      if (map.has(r.employee_id)) continue; // newest active row wins
      map.set(r.employee_id, {
        hourly_rate: rate,
        service_charge:
          Number(r.guaranteed_service_charge_rate ?? 0) ||
          Number(r.estimated_service_charge_rate ?? 0) ||
          0,
      });
    }
    return map;
  }, [query.data]);

  return { rateByEmployee, isLoading: query.isLoading };
}

/** Rate on the staff record, falling back to the contracted rate when it is blank. */
export function resolveEffectiveRate(
  employee: { id: string; hourly_rate?: number | null; service_charge?: number | null },
  contracted: Map<string, ContractedRate>,
): { hourly_rate: number; service_charge: number; fromContract: boolean } {
  const onRecord = Number(employee.hourly_rate ?? 0);
  if (onRecord > 0) {
    return {
      hourly_rate: onRecord,
      service_charge: Number(employee.service_charge ?? 0),
      fromContract: false,
    };
  }
  const fallback = contracted.get(employee.id);
  if (fallback) {
    return { ...fallback, fromContract: true };
  }
  return { hourly_rate: 0, service_charge: Number(employee.service_charge ?? 0), fromContract: false };
}
