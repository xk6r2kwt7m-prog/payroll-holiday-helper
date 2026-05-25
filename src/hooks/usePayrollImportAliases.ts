import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { normaliseAliasName, type SavedAlias } from "@/lib/payroll-matching";

export interface PayrollImportAlias {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  source_system: string;
  raw_timesheet_name: string;
  normalised_timesheet_name: string;
  employee_id: string;
  confirmed_by: string | null;
  confirmed_at: string;
  last_used_at: string | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Read + manage payroll timesheet import aliases for the current tenant.
 *
 * Safety rules enforced by this hook:
 * - Tenant-scoped reads only (RLS also enforces).
 * - Never deletes; deactivate-only (`is_active = false`) to preserve history.
 * - Saving a new alias for an existing normalised name deactivates the previous one first.
 * - Does NOT mutate the employee's legal name or profile in any way.
 */
export function usePayrollImportAliases(sourceSystem: string = "uploaded_timesheet") {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: aliases = [], isLoading } = useQuery({
    queryKey: ["payroll_import_aliases", tenantId, sourceSystem],
    queryFn: async () => {
      if (!tenantId) return [] as PayrollImportAlias[];
      const { data, error } = await supabase
        .from("payroll_import_aliases" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("source_system", sourceSystem)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PayrollImportAlias[];
    },
    enabled: !!tenantId,
  });

  const activeAliases: SavedAlias[] = useMemo(
    () =>
      aliases
        .filter((a) => a.is_active)
        .map((a) => ({
          raw_timesheet_name: a.raw_timesheet_name,
          normalised_timesheet_name: a.normalised_timesheet_name,
          employee_id: a.employee_id,
          is_active: a.is_active,
        })),
    [aliases]
  );

  const saveAlias = useMutation({
    mutationFn: async (input: {
      rawName: string;
      employeeId: string;
      branchId?: string | null;
    }) => {
      if (!tenantId) throw new Error("Tenant not resolved");
      const normalised = normaliseAliasName(input.rawName);
      if (!normalised) throw new Error("Cannot save alias for empty name");

      // Deactivate any existing active alias for the same normalised name.
      await supabase
        .from("payroll_import_aliases" as any)
        .update({ is_active: false })
        .eq("tenant_id", tenantId)
        .eq("source_system", sourceSystem)
        .eq("normalised_timesheet_name", normalised)
        .eq("is_active", true);

      const { data, error } = await supabase
        .from("payroll_import_aliases" as any)
        .insert({
          tenant_id: tenantId,
          branch_id: input.branchId ?? null,
          source_system: sourceSystem,
          raw_timesheet_name: input.rawName,
          normalised_timesheet_name: normalised,
          employee_id: input.employeeId,
          confirmed_by: user?.id ?? null,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PayrollImportAlias;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_import_aliases", tenantId] });
    },
  });

  const deactivateAlias = useMutation({
    mutationFn: async (aliasId: string) => {
      const { error } = await supabase
        .from("payroll_import_aliases" as any)
        .update({ is_active: false })
        .eq("id", aliasId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll_import_aliases", tenantId] });
    },
  });

  const recordUsage = useCallback(
    async (aliasIds: string[]) => {
      if (!aliasIds.length) return;
      // Best-effort fire-and-forget; failure must not block import.
      const now = new Date().toISOString();
      for (const id of aliasIds) {
        const current = aliases.find((a) => a.id === id);
        const nextCount = (current?.usage_count ?? 0) + 1;
        await supabase
          .from("payroll_import_aliases" as any)
          .update({ last_used_at: now, usage_count: nextCount })
          .eq("id", id);
      }
      queryClient.invalidateQueries({ queryKey: ["payroll_import_aliases", tenantId] });
    },
    [aliases, queryClient, tenantId]
  );

  return {
    aliases,
    activeAliases,
    isLoading,
    saveAlias: saveAlias.mutateAsync,
    deactivateAlias: deactivateAlias.mutateAsync,
    recordUsage,
  };
}
