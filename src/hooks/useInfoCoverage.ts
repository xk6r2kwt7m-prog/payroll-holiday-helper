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
              "forename, surname, email, date_of_birth, ni_number, nationality, passport_no, residence_permit, sharing_code, sort_code, bank_account_no",
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
