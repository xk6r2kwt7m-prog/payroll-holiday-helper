import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeInfoCoverage,
  type InfoCoverage,
  type CoverageEmployee,
  type CoverageOnboarding,
} from "@/lib/info-request-coverage";

/**
 * Read-only look at what the system already holds for one member of staff,
 * used so information requests only ask for what is genuinely missing.
 */
export function useInfoCoverage(employeeId?: string, enabled = true) {
  return useQuery<InfoCoverage>({
    queryKey: ["info-coverage", employeeId],
    enabled: !!employeeId && enabled,
    queryFn: async () => {
      const [{ data: employee, error: empError }, { data: onboarding, error: obError }] =
        await Promise.all([
          supabase
            .from("employees")
            .select(
              "forename, surname, email, date_of_birth, nationality, settlement_status, has_ni_number, has_passport, has_share_code, has_bank_details",
            )
            .eq("id", employeeId!)
            .maybeSingle(),
          supabase
            .from("employee_onboarding_data" as any)
            .select("personal_info, bank_details, emergency_contact")
            .eq("employee_id", employeeId!)
            .maybeSingle(),
        ]);
      if (empError) throw empError;
      if (obError) throw obError;
      return computeInfoCoverage(
        employee as unknown as CoverageEmployee | null,
        onboarding as unknown as CoverageOnboarding | null,
      );
    },
  });
}

/**
 * Same read-only check for several staff at once, so a bulk request can ask
 * each person only for the items missing from their own record.
 */
export function useBulkInfoCoverage(employeeIds: string[], enabled = true) {
  const ids = [...employeeIds].sort();
  return useQuery<Record<string, InfoCoverage>>({
    queryKey: ["info-coverage-bulk", ids],
    enabled: enabled && ids.length > 0,
    queryFn: async () => {
      const [{ data: employees, error: empError }, { data: onboarding, error: obError }] =
        await Promise.all([
          supabase
            .from("employees")
            .select(
              "id, forename, surname, email, date_of_birth, nationality, settlement_status, has_ni_number, has_passport, has_share_code, has_bank_details",
            )
            .in("id", ids),
          supabase
            .from("employee_onboarding_data" as any)
            .select("employee_id, personal_info, bank_details, emergency_contact")
            .in("employee_id", ids),
        ]);
      if (empError) throw empError;
      if (obError) throw obError;
      const obById = new Map(
        ((onboarding ?? []) as any[]).map((r) => [r.employee_id as string, r as CoverageOnboarding]),
      );
      const out: Record<string, InfoCoverage> = {};
      for (const emp of ((employees ?? []) as any[])) {
        out[emp.id as string] = computeInfoCoverage(
          emp as CoverageEmployee,
          obById.get(emp.id as string) ?? null,
        );
      }
      return out;
    },
  });
}
