/**
 * Staff-side access to Ugly Dumpling Allergen Safety.
 *
 * Two read-only questions:
 *   1. Is there a published course version for this company?
 *   2. Does the signed-in person have an active assignment to it?
 *
 * The staff page opens only when both are true. Nothing here publishes,
 * assigns, notifies or certifies — it only reads.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";

/** The latest published course version for this company, if any. */
export function usePublishedAllergenVersion() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["allergen-published-version", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_course_versions")
        .select("id, version, published_at")
        .eq("tenant_id", tenantId!)
        .order("version", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as {
        id: string;
        version: number;
        published_at: string | null;
      } | null;
    },
  });
}

export interface MyAllergenAssignment {
  id: string;
  employee_id: string;
  branch_id: string | null;
  audience: string | null;
  course_version: number | null;
  status: string;
  due_date: string | null;
  note: string | null;
}

/**
 * The signed-in person's own active allergen assignment. Test assignments are
 * never returned here — genuine staff access only.
 */
export function useMyAllergenAssignment() {
  const { tenantId } = useTenant();
  const { employeeId, isLoading: employeeLoading } = useCurrentEmployee();
  const query = useQuery({
    queryKey: ["my-allergen-assignment", tenantId, employeeId],
    enabled: !!tenantId && !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergen_assignments")
        .select("id, employee_id, branch_id, audience, course_version, status, due_date, note")
        .eq("tenant_id", tenantId!)
        .eq("employee_id", employeeId!)
        .eq("is_test", false)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as MyAllergenAssignment | null;
    },
  });
  return { ...query, isLoading: employeeLoading || query.isLoading };
}
