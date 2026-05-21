/**
 * Phase 3 — Labour costing helper.
 *
 * Splits labour cost into:
 *   - base labour cost          (hours × base_hourly_rate; counts toward NMW)
 *   - guaranteed service charge supplement (hours × guaranteed_service_charge_rate; NOT NMW)
 *   - estimated service charge  (hours × estimated_service_charge_rate; package only, NOT NMW)
 *
 * Resolves the active `employee_contract_terms` row for a given shift date.
 * If no active terms exist, falls back to the mutable `employees` profile and
 * flags the result so the UI can warn ("Using profile fallback").
 *
 * Service charge MUST NEVER be used to satisfy National Minimum Wage. This
 * helper keeps base and SC components strictly separate.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { Database } from "@/integrations/supabase/types";

export type TermsRow = Database["public"]["Tables"]["employee_contract_terms"]["Row"];

export interface ShiftLabourCost {
  hours: number;
  base_rate: number;
  guaranteed_service_charge_rate: number;
  estimated_service_charge_rate: number;
  base_cost: number;
  guaranteed_sc_cost: number;
  estimated_sc_cost: number;
  /** base + guaranteed SC. Used for "real committed cost". */
  committed_cost: number;
  /** base + guaranteed + estimated SC. Display-only "estimated total package". */
  estimated_total_cost: number;
  source: "employment_terms" | "profile_fallback";
  terms_id: string | null;
  contract_id: string | null;
  warning: string | null;
}

export interface ProfileFallback {
  hourly_rate?: number | null;
  service_charge?: number | null;
}

/**
 * Pick the active terms row for an employee as of a date from an in-memory
 * list (typically already fetched for the period/week).
 */
export function pickActiveTermsForDate(
  termsList: TermsRow[] | undefined | null,
  asOfDate: string,
): TermsRow | null {
  if (!termsList || termsList.length === 0) return null;
  const candidates = termsList.filter(
    (t) =>
      t.effective_from <= asOfDate &&
      (t.effective_to === null || t.effective_to > asOfDate) &&
      (t.status === "active" || t.status === "superseded"),
  );
  if (candidates.length === 0) return null;
  // newest effective_from wins
  candidates.sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1));
  return candidates[0];
}

export function computeShiftLabourCost(
  hours: number,
  terms: TermsRow | null,
  fallback: ProfileFallback,
): ShiftLabourCost {
  const h = Number(hours) || 0;
  let base_rate = 0;
  let guaranteed_sc = 0;
  let estimated_sc = 0;
  let source: ShiftLabourCost["source"] = "profile_fallback";
  let terms_id: string | null = null;
  let contract_id: string | null = null;
  let warning: string | null = null;

  if (terms && (terms.base_hourly_rate ?? terms.hourly_rate) !== null) {
    base_rate = Number(terms.base_hourly_rate ?? terms.hourly_rate ?? 0);
    guaranteed_sc = Number(terms.guaranteed_service_charge_rate ?? 0);
    estimated_sc = Number(terms.estimated_service_charge_rate ?? 0);
    source = "employment_terms";
    terms_id = terms.id;
    contract_id = terms.contract_id;
    if (terms.source_type === "backfill_from_employee_profile") {
      warning = "Terms are backfilled from profile, not a signed contract.";
    }
  } else {
    base_rate = Number(fallback.hourly_rate ?? 0);
    // We do NOT roll the legacy `employees.service_charge` field into the
    // base rate. It is treated as a profile-level SC supplement and shown
    // separately so the user can see it is not NMW-eligible.
    guaranteed_sc = Number(fallback.service_charge ?? 0);
    estimated_sc = 0;
    source = "profile_fallback";
    warning = "Using employee profile fallback, not contract terms.";
  }

  const base_cost = +(h * base_rate).toFixed(2);
  const guaranteed_sc_cost = +(h * guaranteed_sc).toFixed(2);
  const estimated_sc_cost = +(h * estimated_sc).toFixed(2);

  return {
    hours: h,
    base_rate,
    guaranteed_service_charge_rate: guaranteed_sc,
    estimated_service_charge_rate: estimated_sc,
    base_cost,
    guaranteed_sc_cost,
    estimated_sc_cost,
    committed_cost: +(base_cost + guaranteed_sc_cost).toFixed(2),
    estimated_total_cost: +(base_cost + guaranteed_sc_cost + estimated_sc_cost).toFixed(2),
    source,
    terms_id,
    contract_id,
    warning,
  };
}

/**
 * Fetches all employment_terms rows for a set of employees within a date
 * window and returns a Map keyed by employee_id. Callers then use
 * pickActiveTermsForDate per shift date.
 */
export function useEmploymentTermsByEmployee(
  employeeIds: string[],
  windowStart: string | undefined,
  windowEnd: string | undefined,
) {
  const { tenantId } = useTenant();
  const idsKey = [...new Set(employeeIds)].sort().join(",");
  return useQuery({
    queryKey: ["labour_costing_terms", tenantId, windowStart, windowEnd, idsKey],
    enabled: !!tenantId && !!windowStart && !!windowEnd && employeeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_contract_terms")
        .select("*")
        .eq("tenant_id", tenantId!)
        .in("employee_id", employeeIds)
        .or(`effective_to.is.null,effective_to.gte.${windowStart}`)
        .lte("effective_from", windowEnd!)
        .order("effective_from", { ascending: false });
      if (error) throw error;
      const map = new Map<string, TermsRow[]>();
      for (const t of (data ?? []) as TermsRow[]) {
        const list = map.get(t.employee_id) ?? [];
        list.push(t);
        map.set(t.employee_id, list);
      }
      return map;
    },
  });
}
