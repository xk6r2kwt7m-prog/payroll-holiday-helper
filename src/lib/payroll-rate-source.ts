/**
 * Phase 2C — Payroll rate-source helper.
 *
 * When creating new payroll entries (single-add, copy-period, new period
 * dialog, CSV import of newly-matched employees), prefer the rate / service-
 * charge / department from the employee's ACTIVE `employee_contract_terms`
 * row as of the payroll period start date. Fall back to the mutable
 * `employees` profile if no active terms row exists.
 *
 * This does NOT mutate any existing payroll entry. It only changes the
 * defaults applied at entry-creation time.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TermsRow = Database["public"]["Tables"]["employee_contract_terms"]["Row"];

export interface RateSource {
  source: "terms" | "profile_fallback";
  hourly_rate: number;
  service_charge: number;
  service_charge_eligible: boolean | null;
  department: string | null;
  terms_id: string | null;
  contract_id: string | null;
  effective_from: string | null;
  source_type: string | null;
}

interface EmployeeFallback {
  id: string;
  hourly_rate?: number | null;
  service_charge?: number | null;
  department?: string | null;
}

/**
 * Fetch the active employment-terms rows for a list of employees as of a
 * period start date. Returns a Map keyed by employee_id.
 */
export async function fetchActiveTermsMap(
  tenantId: string,
  employeeIds: string[],
  periodStartDate: string,
): Promise<Map<string, TermsRow>> {
  const out = new Map<string, TermsRow>();
  if (!tenantId || employeeIds.length === 0 || !periodStartDate) return out;

  const { data, error } = await supabase
    .from("employee_contract_terms")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("employee_id", employeeIds)
    .lte("effective_from", periodStartDate)
    .or(`effective_to.is.null,effective_to.gt.${periodStartDate}`)
    .in("status", ["active", "superseded"])
    .order("effective_from", { ascending: false });

  if (error) throw error;

  for (const row of (data ?? []) as TermsRow[]) {
    if (!out.has(row.employee_id)) out.set(row.employee_id, row);
  }
  return out;
}

/**
 * Resolve the rate-source for a single employee given (optional) preloaded
 * terms row and a fallback employee profile.
 */
export function resolveRateSource(
  terms: TermsRow | undefined | null,
  fallback: EmployeeFallback,
): RateSource {
  if (terms && terms.hourly_rate !== null && terms.hourly_rate !== undefined) {
    return {
      source: "terms",
      hourly_rate: Number(terms.hourly_rate),
      service_charge:
        terms.service_charge_eligible === false
          ? 0
          : Number(fallback.service_charge ?? 0),
      service_charge_eligible: terms.service_charge_eligible ?? null,
      department: terms.department ?? fallback.department ?? null,
      terms_id: terms.id,
      contract_id: terms.contract_id,
      effective_from: terms.effective_from,
      source_type: terms.source_type,
    };
  }
  return {
    source: "profile_fallback",
    hourly_rate: Number(fallback.hourly_rate ?? 0),
    service_charge: Number(fallback.service_charge ?? 0),
    service_charge_eligible: null,
    department: fallback.department ?? null,
    terms_id: null,
    contract_id: null,
    effective_from: null,
    source_type: null,
  };
}

/**
 * Convenience: resolve rate-source for one employee against the DB.
 */
export async function getEntryDefaultsFromTerms(
  tenantId: string,
  employeeId: string,
  periodStartDate: string,
  fallback: EmployeeFallback,
): Promise<RateSource> {
  const map = await fetchActiveTermsMap(tenantId, [employeeId], periodStartDate);
  return resolveRateSource(map.get(employeeId), fallback);
}
