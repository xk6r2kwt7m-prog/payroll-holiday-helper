import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

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
 * Resolves the employee record linked to the signed-in user WITHIN the
 * active workspace (employees.user_id = auth.uid() AND tenant_id = active).
 *
 * A failed lookup is reported as `isError` — it is never shown as
 * "no employee linked". `isLinked` is only false once the lookup succeeded
 * and genuinely found no record.
 */
export function useCurrentEmployee() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["current_employee", tenantId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, forename, surname, contract_country, work_country, department, tenant_id, status, pay_type, start_date, hourly_rate")
        .eq("user_id", userId!)
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return (data as CurrentEmployee | null) ?? null;
    },
    enabled: !!userId && !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const resolved = query.isSuccess;
  const employee = resolved ? query.data ?? null : null;

  return {
    employee,
    /** Only meaningful when `isResolved` — false before/if the lookup fails. */
    isLinked: !!employee,
    /** True while identity/workspace is unresolved or the lookup is running. */
    isLoading: !userId || !tenantId ? !!userId && !tenantId : query.isLoading,
    isError: query.isError,
    isResolved: resolved,
    refetch: query.refetch,
    employeeId: employee?.id ?? null,
    employeeName: employee ? `${employee.forename} ${employee.surname}` : null,
  };
}
