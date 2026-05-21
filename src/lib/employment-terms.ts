/**
 * Employment terms resolver — Phase 1
 *
 * Returns the operational employment terms (rate, role, department, etc.) that
 * were active for an employee on a given date.
 *
 * NOTE: This is the foundation for future payroll / rota integration.
 * Payroll and rota calculations still read from `employees.*` directly today.
 * Do NOT switch callers over until the next phase explicitly does so.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EmploymentTerms = Database["public"]["Tables"]["employee_contract_terms"]["Row"];

/**
 * Returns the employment terms row active for an employee on a given date,
 * or null if none exists.
 */
export async function getActiveEmploymentTerms(
  employeeId: string,
  asOf: Date | string = new Date(),
): Promise<EmploymentTerms | null> {
  const asOfDate =
    typeof asOf === "string" ? asOf : asOf.toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc("get_active_employment_terms", {
    _employee_id: employeeId,
    _as_of: asOfDate,
  });

  if (error) throw error;
  if (!data) return null;
  // RPC returning a record can come back as a single object or array depending on PostgREST
  if (Array.isArray(data)) return (data[0] as EmploymentTerms) ?? null;
  return data as EmploymentTerms;
}

/**
 * Returns the full history of terms for an employee, newest first.
 */
export async function getEmploymentTermsHistory(
  employeeId: string,
): Promise<EmploymentTerms[]> {
  const { data, error } = await supabase
    .from("employee_contract_terms")
    .select("*")
    .eq("employee_id", employeeId)
    .order("effective_from", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EmploymentTerms[];
}
