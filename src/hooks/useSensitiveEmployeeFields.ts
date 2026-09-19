import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";

/**
 * Bank details, National Insurance numbers and identity document numbers.
 *
 * These never travel with an ordinary staff query — the database refuses to
 * return them. They are read here, one deliberate request at a time, through a
 * database function that returns nothing at all unless the person asking is an
 * administrator of the tenant.
 */
export interface SensitiveEmployeeFields {
  employee_id: string;
  ni_number: string | null;
  bank_account_no: string | null;
  sort_code: string | null;
  passport_no: string | null;
  sharing_code: string | null;
  residence_permit: string | null;
}

const EMPTY: SensitiveEmployeeFields = {
  employee_id: "",
  ni_number: null,
  bank_account_no: null,
  sort_code: null,
  passport_no: null,
  sharing_code: null,
  residence_permit: null,
};

/** One person's protected values. Returns nothing for non-administrators. */
export function useSensitiveEmployeeFields(employeeId?: string | null, enabled = true) {
  const { isAdmin } = useAuth();
  return useQuery<SensitiveEmployeeFields | null>({
    queryKey: ["employee-sensitive", employeeId],
    enabled: !!employeeId && enabled && isAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("employee_sensitive_fields" as never, {
        _employee_id: employeeId,
      } as never);
      if (error) throw error;
      const row = (data as unknown as SensitiveEmployeeFields[] | null)?.[0];
      return row ? { ...EMPTY, ...row } : null;
    },
  });
}

/**
 * Protected values for the whole team, keyed by staff id. Used only where a
 * payroll file or bank export genuinely needs them, and only for
 * administrators — everyone else receives an empty map.
 */
export function useTenantSensitiveFields(enabled = true) {
  const { tenantId } = useTenant();
  const { isAdmin } = useAuth();
  return useQuery<Record<string, SensitiveEmployeeFields>>({
    queryKey: ["tenant-sensitive", tenantId],
    enabled: !!tenantId && enabled && isAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("tenant_sensitive_fields" as never, {
        _tenant_id: tenantId,
      } as never);
      if (error) throw error;
      const out: Record<string, SensitiveEmployeeFields> = {};
      for (const row of (data as unknown as SensitiveEmployeeFields[] | null) ?? []) {
        out[row.employee_id] = { ...EMPTY, ...row };
      }
      return out;
    },
  });
}
