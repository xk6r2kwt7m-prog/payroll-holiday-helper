/**
 * Hook for fetching training effectiveness records.
 * Admin-only — gated by caller's permission check.
 * Uses batched queries to avoid N+1 patterns.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { EffectivenessRecord } from "@/lib/training-effectiveness";
import {
  computeEffectivenessMetrics,
  getLatestByModule,
  type EffectivenessMetrics,
} from "@/lib/training-effectiveness";

export function useTrainingEffectiveness(enabled: boolean) {
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["training_effectiveness", tenantId],
    queryFn: async (): Promise<EffectivenessRecord[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("training_effectiveness_records" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("measured_at", { ascending: false });

      if (error) {
        console.error("Error fetching effectiveness records:", error);
        return [];
      }

      return (data ?? []) as unknown as EffectivenessRecord[];
    },
    enabled: enabled && !!tenantId,
    staleTime: 60_000, // 1 minute cache
  });

  const records = query.data ?? [];
  const metrics: EffectivenessMetrics = computeEffectivenessMetrics(records);
  const latestByModule = getLatestByModule(records);

  return {
    ...query,
    records,
    metrics,
    latestByModule,
  };
}
