import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

/**
 * One submitted value still waiting for a manager to accept or reject it.
 *
 * Only the facts needed to show what is waiting are read here — never the old
 * or new value, which are sensitive and only shown on the review screen.
 */
export interface PendingDetailDecision {
  employee_id: string;
  field_label: string;
  sensitive: boolean;
  created_at: string;
  employee_name: string;
}

/**
 * Every pending, needs-review detail change for the current tenant, with each
 * employee's name. Only employee_id, field_label, sensitive and created_at are
 * selected — old_value and new_value are never read here.
 */
export function usePendingDetailDecisions() {
  const { tenantId } = useTenant();
  return useQuery<PendingDetailDecision[]>({
    queryKey: ["pending_detail_decisions", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_detail_changes")
        .select(
          "employee_id, field_label, sensitive, created_at, employees(forename, surname, preferred_name)",
        )
        .eq("tenant_id", tenantId!)
        .eq("state", "pending")
        .eq("needs_review", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Array<{
        employee_id: string;
        field_label: string;
        sensitive: boolean;
        created_at: string;
        employees: { forename: string | null; surname: string | null; preferred_name: string | null } | null;
      }>).map((row) => ({
        employee_id: row.employee_id,
        field_label: row.field_label,
        sensitive: row.sensitive,
        created_at: row.created_at,
        employee_name:
          (row.employees?.preferred_name ||
            row.employees?.forename ||
            "") +
          (row.employees?.surname ? ` ${row.employees.surname}` : "").trim() ||
          "Unknown",
      }));
    },
  });
}
