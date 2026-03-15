/**
 * Shared governance health classification for UGLŌ Standard modules.
 * Single source of truth — used by dashboard and list views.
 */

import { isReviewStale } from "@/lib/review-governance";
import type { GovernanceCounts } from "@/hooks/useGovernanceSummary";
import type { ServiceRiskLevel } from "@/data/training-standards/types";

export type GovernanceHealth = "ready" | "stale" | "partial" | "weak" | "unreviewed";

export interface ModuleGovernanceInput {
  lastReviewedAt: string | null;
  counts: GovernanceCounts;
  isMandatory: boolean;
  serviceRiskLevel: ServiceRiskLevel | undefined;
}

/**
 * Classify a module's governance health.
 *
 * Rules (evaluated top-down, first match wins):
 * - ready:       reviewed (not stale) + ≥2 evidence + ≥1 insight
 * - stale:       was reviewed but review is now stale (>180 days)
 * - partial:     has some evidence or insights but not enough for ready
 * - weak:        reviewed but no evidence; or insights without evidence; or evidence without insights
 * - unreviewed:  never reviewed
 */
export function classifyGovernance(input: ModuleGovernanceInput): GovernanceHealth {
  const { lastReviewedAt, counts } = input;
  const hasEvidence = counts.evidenceCount > 0;
  const hasInsights = counts.insightCount > 0;
  const wasReviewed = !!lastReviewedAt;
  const stale = isReviewStale(lastReviewedAt);

  // Never reviewed at all
  if (!wasReviewed) return "unreviewed";

  // Was reviewed but is now stale
  if (stale) return "stale";

  // Reviewed + strong evidence + insights = ready
  if (hasEvidence && counts.evidenceCount >= 2 && hasInsights) return "ready";

  // Reviewed but weak signals
  if (!hasEvidence && !hasInsights) return "weak";          // reviewed but nothing supports it
  if (hasInsights && !hasEvidence) return "weak";           // insights without evidence
  if (hasEvidence && !hasInsights) return "partial";        // evidence but no review insights

  // Has some evidence (1) + insights → partial
  return "partial";
}

export const GOVERNANCE_HEALTH_CONFIG: Record<GovernanceHealth, { label: string; color: string; description: string }> = {
  ready:      { label: "Ready",       color: "bg-success/10 text-success",               description: "Reviewed, evidence-backed, insight-linked" },
  stale:      { label: "Stale",       color: "bg-warning/10 text-warning",               description: "Review is older than 180 days" },
  partial:    { label: "Partial",     color: "bg-primary/10 text-primary",               description: "Some evidence or insights but incomplete" },
  weak:       { label: "Weak",        color: "bg-destructive/10 text-destructive",       description: "Reviewed but lacks supporting evidence" },
  unreviewed: { label: "Unreviewed",  color: "bg-muted text-muted-foreground",           description: "Never reviewed by an admin" },
};

/**
 * Compute aggregate governance metrics for a set of modules.
 */
export interface GovernanceMetrics {
  total: number;
  ready: number;
  stale: number;
  partial: number;
  weak: number;
  unreviewed: number;
  evidenceNoInsights: number;
  insightsNoEvidence: number;
  mandatoryWeak: number;
  highRiskConcern: number; // high-risk modules that are not ready
}

export function computeGovernanceMetrics(
  modules: Array<{
    id: string;
    last_reviewed_at: string | null;
    is_mandatory: boolean;
    standards_metadata: { service_risk_level?: ServiceRiskLevel; operational_area?: string } | null;
  }>,
  govCounts: Record<string, GovernanceCounts>,
): GovernanceMetrics {
  const m: GovernanceMetrics = {
    total: modules.length, ready: 0, stale: 0, partial: 0, weak: 0, unreviewed: 0,
    evidenceNoInsights: 0, insightsNoEvidence: 0, mandatoryWeak: 0, highRiskConcern: 0,
  };

  for (const mod of modules) {
    const counts = govCounts[mod.id] ?? { evidenceCount: 0, insightCount: 0 };
    const riskLevel = (mod.standards_metadata as any)?.service_risk_level as ServiceRiskLevel | undefined;
    const health = classifyGovernance({
      lastReviewedAt: mod.last_reviewed_at,
      counts,
      isMandatory: mod.is_mandatory,
      serviceRiskLevel: riskLevel,
    });

    m[health]++;

    if (counts.evidenceCount > 0 && counts.insightCount === 0) m.evidenceNoInsights++;
    if (counts.insightCount > 0 && counts.evidenceCount === 0) m.insightsNoEvidence++;
    if (mod.is_mandatory && (health === "weak" || health === "unreviewed")) m.mandatoryWeak++;
    if (riskLevel === "high" && health !== "ready") m.highRiskConcern++;
  }

  return m;
}
