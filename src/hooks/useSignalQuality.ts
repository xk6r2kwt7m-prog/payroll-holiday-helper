/**
 * Hook for computing signal quality per module.
 * Admin-only — gated by caller's permission check.
 * Derives quality from existing review insights and evidence counts.
 * No additional DB queries — uses data already fetched by useGovernanceSummary + useReviewInsights.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import type { ReviewInsight } from "@/hooks/useReviewInsights";
import type { GovernanceCounts } from "@/hooks/useGovernanceSummary";
import {
  assessSignalQuality,
  computeSignalQualityMetrics,
  type SignalQualityRecord,
  type SignalQualityMetrics,
} from "@/lib/signal-quality";

/**
 * Batch-fetches all active review insights for the tenant,
 * then derives signal quality per module using governance counts.
 */
export function useSignalQuality(enabled: boolean, govCounts: Record<string, GovernanceCounts>) {
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["signal_quality_insights_batch", tenantId],
    queryFn: async (): Promise<ReviewInsight[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("training_review_insights")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);
      if (error) {
        console.error("Error fetching insights for signal quality:", error);
        return [];
      }
      return (data ?? []) as unknown as ReviewInsight[];
    },
    enabled: enabled && !!tenantId,
    staleTime: 30_000,
  });

  const allInsights = query.data ?? [];

  // Group insights by module
  const insightsByModule = new Map<string, ReviewInsight[]>();
  const insightsByTag = new Map<string, ReviewInsight[]>();

  for (const ins of allInsights) {
    if (ins.document_id) {
      if (!insightsByModule.has(ins.document_id)) insightsByModule.set(ins.document_id, []);
      insightsByModule.get(ins.document_id)!.push(ins);
    }
    if (!insightsByTag.has(ins.insight_tag)) insightsByTag.set(ins.insight_tag, []);
    insightsByTag.get(ins.insight_tag)!.push(ins);
  }

  // Compute quality for every module that has governance counts
  const qualityByModule = new Map<string, SignalQualityRecord>();
  const allRecords: SignalQualityRecord[] = [];

  for (const [moduleId, counts] of Object.entries(govCounts)) {
    const moduleInsights = insightsByModule.get(moduleId) ?? [];
    const record = assessSignalQuality({
      moduleId,
      insights: moduleInsights,
      evidenceCount: counts.evidenceCount,
      insightCount: counts.insightCount,
      allInsightsByTag: insightsByTag,
    });
    qualityByModule.set(moduleId, record);
    allRecords.push(record);
  }

  // Also assess modules that have insights but aren't in govCounts
  for (const [moduleId, moduleInsights] of insightsByModule) {
    if (!qualityByModule.has(moduleId)) {
      const counts = govCounts[moduleId] ?? { evidenceCount: 0, insightCount: 0 };
      const record = assessSignalQuality({
        moduleId,
        insights: moduleInsights,
        evidenceCount: counts.evidenceCount,
        insightCount: counts.insightCount,
        allInsightsByTag: insightsByTag,
      });
      qualityByModule.set(moduleId, record);
      allRecords.push(record);
    }
  }

  const metrics: SignalQualityMetrics = computeSignalQualityMetrics(allRecords);

  return {
    ...query,
    qualityByModule,
    allRecords,
    metrics,
  };
}
