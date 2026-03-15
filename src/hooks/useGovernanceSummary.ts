/**
 * Batched governance summary hook.
 * Fetches evidence and insight counts for ALL modules in one query each,
 * avoiding N+1 patterns when rendering the library list.
 * Admin-only — gated by caller.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GovernanceCounts {
  evidenceCount: number;
  insightCount: number;
}

/**
 * Returns a map of document_id → { evidenceCount, insightCount }
 * using only two aggregated queries (one per table).
 */
export function useGovernanceSummary(enabled: boolean) {
  return useQuery({
    queryKey: ["governance_summary_batch"],
    queryFn: async (): Promise<Record<string, GovernanceCounts>> => {
      const [evidenceRes, insightRes] = await Promise.all([
        supabase
          .from("training_module_evidence")
          .select("document_id, is_active")
          .eq("is_active", true),
        supabase
          .from("training_review_insights")
          .select("document_id, is_active")
          .eq("is_active", true),
      ]);

      const map: Record<string, GovernanceCounts> = {};

      const ensure = (id: string) => {
        if (!map[id]) map[id] = { evidenceCount: 0, insightCount: 0 };
      };

      if (evidenceRes.data) {
        for (const row of evidenceRes.data) {
          if (row.document_id) {
            ensure(row.document_id);
            map[row.document_id].evidenceCount++;
          }
        }
      }

      if (insightRes.data) {
        for (const row of insightRes.data) {
          if (row.document_id) {
            ensure(row.document_id);
            map[row.document_id].insightCount++;
          }
        }
      }

      return map;
    },
    enabled,
    staleTime: 30_000, // 30s cache to avoid refetching on every re-render
  });
}
