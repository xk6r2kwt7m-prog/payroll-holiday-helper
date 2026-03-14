import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CurrentEmployee {
  id: string;
  forename: string;
  surname: string;
  contract_country: string | null;
  work_country: string | null;
  department: string;
  tenant_id: string;
  status: string;
  pay_type: string | null;
  start_date: string | null;
  hourly_rate: number | null;
}

/**
 * Resolves the employee record linked to the current logged-in user.
 * Uses employees.user_id = auth.uid().
 *
 * Returns:
 * - employee: the linked record (or null)
 * - isLinked: whether a link exists
 * - isLoading: query loading state
 */
export function useCurrentEmployee() {
  const { user } = useAuth();

  const { data: employee = null, isLoading } = useQuery({
    queryKey: ["current_employee", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("id, forename, surname, contract_country, work_country, department, tenant_id, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Failed to resolve employee link:", error);
        return null;
      }
      return data as CurrentEmployee | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    employee,
    isLinked: !!employee,
    isLoading,
    employeeId: employee?.id ?? null,
    employeeName: employee ? `${employee.forename} ${employee.surname}` : null,
  };
}
