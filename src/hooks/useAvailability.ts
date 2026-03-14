import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  tenant_id: string;
  day_of_week: number;
  is_available: boolean;
  available_from: string | null;
  available_to: string | null;
  notes: string | null;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export { DAY_NAMES };

export function useEmployeeAvailability(employeeId?: string) {
  return useQuery({
    queryKey: ["employee_availability", employeeId],
    queryFn: async () => {
      if (!employeeId) return [] as EmployeeAvailability[];
      const { data, error } = await supabase
        .from("employee_availability" as any)
        .select("*")
        .eq("employee_id", employeeId)
        .order("day_of_week");
      if (error) throw error;
      return (data || []) as unknown as EmployeeAvailability[];
    },
    enabled: !!employeeId,
  });
}

export function useAllEmployeeAvailability() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["employee_availability", "all", tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as EmployeeAvailability[];
      const { data, error } = await supabase
        .from("employee_availability" as any)
        .select("*")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []) as unknown as EmployeeAvailability[];
    },
    enabled: !!tenantId,
  });
}

export function useUpsertAvailability() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({
      employeeId,
      slots,
    }: {
      employeeId: string;
      slots: { day_of_week: number; is_available: boolean; available_from?: string; available_to?: string; notes?: string }[];
    }) => {
      // Delete existing, then insert
      await supabase
        .from("employee_availability" as any)
        .delete()
        .eq("employee_id", employeeId);

      if (slots.length === 0) return;

      const rows = slots.map((s) => ({
        employee_id: employeeId,
        tenant_id: tenantId!,
        ...s,
      }));

      const { error } = await supabase.from("employee_availability" as any).insert(rows as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employee_availability"] });
      toast.success("Availability updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
