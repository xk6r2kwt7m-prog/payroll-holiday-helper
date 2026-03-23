import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface PayrollEntryLocation {
  id: string;
  payroll_entry_id: string;
  payroll_period_id: string;
  employee_id: string;
  location_name: string;
  department: string | null;
  hours: number;
  imported_source: string | null;
  tenant_id: string;
  created_at: string;
}

export function usePayrollEntryLocations(periodId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["payroll_entry_locations", tenantId, periodId],
    queryFn: async () => {
      if (!tenantId || !periodId) return [] as PayrollEntryLocation[];
      const { data, error } = await supabase
        .from("payroll_entry_locations")
        .select("*")
        .eq("payroll_period_id", periodId)
        .eq("tenant_id", tenantId)
        .order("location_name");
      if (error) throw error;
      return (data || []) as PayrollEntryLocation[];
    },
    enabled: !!tenantId && !!periodId,
  });
}

export function useEmployeeLocationSplit(periodId?: string, employeeId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["payroll_entry_locations", tenantId, periodId, employeeId],
    queryFn: async () => {
      if (!tenantId || !periodId || !employeeId) return [] as PayrollEntryLocation[];
      const { data, error } = await supabase
        .from("payroll_entry_locations")
        .select("*")
        .eq("payroll_period_id", periodId)
        .eq("employee_id", employeeId)
        .eq("tenant_id", tenantId)
        .order("hours", { ascending: false });
      if (error) throw error;
      return (data || []) as PayrollEntryLocation[];
    },
    enabled: !!tenantId && !!periodId && !!employeeId,
  });
}

/** Aggregate location analytics for a period */
export function useLocationAnalytics(periodId?: string) {
  const { data: locations = [] } = usePayrollEntryLocations(periodId);

  const analytics = (() => {
    if (locations.length === 0) return null;

    const byLocation = new Map<string, { hours: number; employeeIds: Set<string>; departments: Set<string> }>();

    for (const loc of locations) {
      const existing = byLocation.get(loc.location_name);
      if (existing) {
        existing.hours += Number(loc.hours);
        existing.employeeIds.add(loc.employee_id);
        if (loc.department) existing.departments.add(loc.department);
      } else {
        byLocation.set(loc.location_name, {
          hours: Number(loc.hours),
          employeeIds: new Set([loc.employee_id]),
          departments: new Set(loc.department ? [loc.department] : []),
        });
      }
    }

    return Array.from(byLocation.entries())
      .map(([name, data]) => ({
        location: name,
        hours: data.hours,
        headcount: data.employeeIds.size,
        departments: Array.from(data.departments),
      }))
      .sort((a, b) => b.hours - a.hours);
  })();

  return { data: analytics, hasLocationData: locations.length > 0 };
}

export function useSavePayrollEntryLocations() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({
      periodId,
      entries,
    }: {
      periodId: string;
      entries: {
        payroll_entry_id: string;
        employee_id: string;
        locations: { name: string; hours: number; department?: string }[];
      }[];
    }) => {
      if (!tenantId) throw new Error("No tenant");

      // Delete existing location data for this period (fresh import replaces)
      await supabase
        .from("payroll_entry_locations")
        .delete()
        .eq("payroll_period_id", periodId)
        .eq("tenant_id", tenantId);

      // Build rows
      const rows = entries.flatMap((entry) =>
        entry.locations.map((loc) => ({
          payroll_entry_id: entry.payroll_entry_id,
          payroll_period_id: periodId,
          employee_id: entry.employee_id,
          location_name: loc.name,
          department: loc.department || null,
          hours: loc.hours,
          imported_source: "csv_import",
          tenant_id: tenantId,
        }))
      );

      if (rows.length > 0) {
        // Insert in batches of 100
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const { error } = await supabase
            .from("payroll_entry_locations")
            .insert(batch);
          if (error) throw error;
        }
      }

      return rows.length;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["payroll_entry_locations", tenantId, variables.periodId],
      });
    },
  });
}
