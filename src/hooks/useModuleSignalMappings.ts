/**
 * Hook for managing module-to-signal mappings.
 * Reads from module_signal_mappings table, provides CRUD mutations.
 * Admin-only — gated by caller's permission check.
 * Includes audit logging for all mapping changes.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import type { SignalMapping, MappingSource } from "@/lib/signal-mapping";
import { writeTrainingAudit } from "@/hooks/useTrainingLibrary";
import { toast } from "sonner";

export function useModuleSignalMappings(moduleId?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const queryKey = ["module_signal_mappings", tenantId, moduleId ?? "all"];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<SignalMapping[]> => {
      if (!tenantId) return [];

      let q = supabase
        .from("module_signal_mappings" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (moduleId) {
        q = q.eq("module_id", moduleId);
      }

      const { data, error } = await q;
      if (error) {
        console.error("Error fetching signal mappings:", error);
        return [];
      }
      return (data ?? []) as unknown as SignalMapping[];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  // ─── Upsert mapping ───
  const upsertMapping = useMutation({
    mutationFn: async (input: {
      module_id: string;
      signal_tag: string;
      mapping_source: MappingSource;
      is_active: boolean;
      priority?: number;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error("No tenant");

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { error } = await supabase
        .from("module_signal_mappings" as any)
        .upsert(
          {
            tenant_id: tenantId,
            module_id: input.module_id,
            signal_tag: input.signal_tag,
            mapping_source: input.mapping_source,
            is_active: input.is_active,
            priority: input.priority ?? 0,
            notes: input.notes ?? null,
            created_by: userId,
          },
          { onConflict: "tenant_id,module_id,signal_tag,mapping_source" }
        );

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["module_signal_mappings", tenantId] });
      if (tenantId) {
        const action = variables.mapping_source === "manual" ? "manual_mapping_added" : "mapping_enabled";
        writeTrainingAudit({
          tenant_id: tenantId,
          action,
          metadata: {
            module_id: variables.module_id,
            signal_tag: variables.signal_tag,
            mapping_source: variables.mapping_source,
            is_active: variables.is_active,
          },
        });
      }
    },
    onError: (err: any) => {
      toast.error("Failed to save mapping: " + (err.message || "Unknown error"));
    },
  });

  // ─── Toggle active state ───
  const toggleMapping = useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("module_signal_mappings" as any)
        .update({ is_active: input.is_active })
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["module_signal_mappings", tenantId] });
      if (tenantId) {
        writeTrainingAudit({
          tenant_id: tenantId,
          action: variables.is_active ? "mapping_enabled" : "mapping_disabled",
          metadata: { mapping_id: variables.id, is_active: variables.is_active },
        });
      }
    },
    onError: (err: any) => {
      toast.error("Failed to toggle mapping: " + (err.message || "Unknown error"));
    },
  });

  // ─── Delete mapping ───
  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("module_signal_mappings" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["module_signal_mappings", tenantId] });
      toast.success("Mapping removed");
      if (tenantId) {
        writeTrainingAudit({
          tenant_id: tenantId,
          action: "manual_mapping_deleted",
          metadata: { mapping_id: variables },
        });
      }
    },
    onError: (err: any) => {
      toast.error("Failed to delete mapping: " + (err.message || "Unknown error"));
    },
  });

  return {
    ...query,
    mappings: query.data ?? [],
    upsertMapping,
    toggleMapping,
    deleteMapping,
  };
}

/**
 * Batch hook for loading all mappings across all modules (for dashboard views).
 */
export function useAllModuleSignalMappings() {
  return useModuleSignalMappings(undefined);
}
