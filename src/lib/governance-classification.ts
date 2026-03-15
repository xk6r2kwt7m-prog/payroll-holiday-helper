/**
 * Shared governance health classification for UGLŌ Standard modules.
 * Single source of truth — used by dashboard, list, and detail views.
 */

import { isReviewStale, STALE_REVIEW_THRESHOLD_DAYS } from "@/lib/review-governance";
import { differenceInDays, parseISO, format } from "date-fns";
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
 */
export function classifyGovernance(input: ModuleGovernanceInput): GovernanceHealth {
  const { lastReviewedAt, counts } = input;
  const hasEvidence = counts.evidenceCount > 0;
  const hasInsights = counts.insightCount > 0;
  const wasReviewed = !!lastReviewedAt;
  const stale = isReviewStale(lastReviewedAt);

  if (!wasReviewed) return "unreviewed";
  if (stale) return "stale";
  if (hasEvidence && counts.evidenceCount >= 2 && hasInsights) return "ready";
  if (!hasEvidence && !hasInsights) return "weak";
  if (hasInsights && !hasEvidence) return "weak";
  if (hasEvidence && !hasInsights) return "partial";
  return "partial";
}

export const GOVERNANCE_HEALTH_CONFIG: Record<GovernanceHealth, { label: string; color: string; description: string }> = {
  ready:      { label: "Ready",       color: "bg-success/10 text-success",               description: "Reviewed, evidence-backed, insight-linked" },
  stale:      { label: "Stale",       color: "bg-warning/10 text-warning",               description: "Review is older than 180 days" },
  partial:    { label: "Partial",     color: "bg-primary/10 text-primary",               description: "Some evidence or insights but incomplete" },
  weak:       { label: "Weak",        color: "bg-destructive/10 text-destructive",       description: "Reviewed but lacks supporting evidence" },
  unreviewed: { label: "Unreviewed",  color: "bg-muted text-muted-foreground",           description: "Never reviewed by an admin" },
};

// ─── Governance Reasons (human-readable explanations) ───

/**
 * Return specific, actionable reasons explaining why a module has its current health.
 * Used in tooltips, queue rows, and the standards tab recommendation line.
 */
export function getGovernanceReasons(input: ModuleGovernanceInput): string[] {
  const { lastReviewedAt, counts } = input;
  const reasons: string[] = [];

  if (!lastReviewedAt) {
    reasons.push("Never reviewed");
  } else {
    const daysAgo = differenceInDays(new Date(), parseISO(lastReviewedAt));
    if (daysAgo > STALE_REVIEW_THRESHOLD_DAYS) {
      reasons.push(`Reviewed ${daysAgo} days ago (stale after ${STALE_REVIEW_THRESHOLD_DAYS})`);
    } else {
      reasons.push(`Reviewed ${format(parseISO(lastReviewedAt), "d MMM yyyy")}`);
    }
  }

  if (counts.evidenceCount === 0) {
    reasons.push("No evidence sources");
  } else if (counts.evidenceCount === 1) {
    reasons.push("Only 1 evidence source (need ≥2 for ready)");
  }

  if (counts.insightCount === 0 && counts.evidenceCount > 0) {
    reasons.push("Evidence exists but no review insights link it to training needs");
  }
  if (counts.insightCount > 0 && counts.evidenceCount === 0) {
    reasons.push("Has insights but no evidence supports them");
  }

  return reasons;
}

/**
 * Return a single recommended admin action based on governance state.
 */
export function getGovernanceRecommendation(input: ModuleGovernanceInput): string | null {
  const health = classifyGovernance(input);
  const { lastReviewedAt, counts } = input;

  switch (health) {
    case "unreviewed":
      return "Recommended: review this module and add evidence sources";
    case "stale":
      return "Recommended: re-review this module — last review is over 180 days old";
    case "weak":
      if (counts.insightCount > 0 && counts.evidenceCount === 0) {
        return "Recommended: add evidence sources to support existing insights";
      }
      return "Recommended: add evidence sources and review insights";
    case "partial":
      if (counts.evidenceCount < 2) {
        return "Recommended: add more evidence sources (need ≥2 for ready)";
      }
      if (counts.insightCount === 0) {
        return "Recommended: link review insights to training response";
      }
      return "Recommended: complete evidence and insight coverage";
    case "ready":
      return null;
  }
}

// ─── Priority scoring for the action queue ───

/**
 * Priority score: lower = more urgent. Used to sort the action queue.
 *
 * Tiers:
 *   0-9:   high-risk + weak/unreviewed
 *   10-19: high-risk + stale
 *   20-29: mandatory + weak/unreviewed
 *   30-39: stale
 *   40-49: weak
 *   50-59: partial
 *   100:   ready (excluded from queue)
 */
export function getGovernancePriority(input: ModuleGovernanceInput): number {
  const health = classifyGovernance(input);
  const isHighRisk = input.serviceRiskLevel === "high";

  if (health === "ready") return 100;

  if (isHighRisk && (health === "weak" || health === "unreviewed")) return 0;
  if (isHighRisk && health === "stale") return 10;
  if (isHighRisk && health === "partial") return 15;
  if (input.isMandatory && (health === "weak" || health === "unreviewed")) return 20;
  if (input.isMandatory && health === "stale") return 25;
  if (health === "stale") return 30;
  if (health === "weak") return 40;
  if (health === "unreviewed") return 45;
  if (health === "partial") return 50;
  return 60;
}

// ─── Aggregate metrics ───

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
  highRiskConcern: number;
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
