/**
 * Training Effectiveness Engine
 * 
 * Deterministic scoring, signal-to-module mapping, confidence rules,
 * and recommendation generation for the Training Effectiveness Layer.
 * 
 * This module is purely computational — no database queries.
 */

import type { ReviewInsightTag } from "@/data/training-standards/types";

// ─── Types ───

export type EvaluationType = "module_level" | "location_level" | "employee_level" | "refresher_level";
export type EffectivenessResult = "improved" | "unchanged" | "worsened" | "insufficient_data";
export type ConfidenceLevel = "high" | "medium" | "low";
export type EffectivenessScore = "strong_positive" | "positive" | "neutral" | "negative" | "insufficient";

export interface EffectivenessRecord {
  id: string;
  tenant_id: string;
  module_id: string;
  location_id: string | null;
  employee_id: string | null;
  evaluation_type: EvaluationType;
  evaluation_window_days: number;
  baseline_signal_count: number;
  post_training_signal_count: number;
  delta_count: number;
  delta_percent: number;
  result_status: EffectivenessResult;
  confidence_level: ConfidenceLevel;
  signal_types: string[];
  measured_at: string;
  notes: string | null;
}

export interface EffectivenessInput {
  baselineCount: number;
  postCount: number;
  evaluationType: EvaluationType;
}

export interface EffectivenessOutput {
  deltaCount: number;
  deltaPercent: number;
  resultStatus: EffectivenessResult;
  confidenceLevel: ConfidenceLevel;
  score: EffectivenessScore;
  label: string;
  recommendation: string;
}

// ─── Signal-to-Module Mapping ───

/**
 * Explicit mapping from review insight tags to training signal types.
 * Each module inherits its relevant signals from standards_metadata.review_insight_tags.
 */
export const SIGNAL_MODULE_MAP: Record<string, ReviewInsightTag[]> = {
  "queue_handling": ["recurring_delay_issue", "complaint_recovery_issue"],
  "allergen_safety": ["allergen_confidence_issue"],
  "cleanliness": ["cleanliness_issue"],
  "complaint_handling": ["complaint_recovery_issue", "staff_attitude_issue"],
  "food_temperature": ["food_temperature_issue"],
  "ambience": ["ambience_issue"],
  "staff_attitude": ["staff_attitude_issue"],
  "value_perception": ["value_for_money_issue"],
};

/**
 * Get the signal types a module is meant to improve,
 * based on its review_insight_tags in standards_metadata.
 */
export function getModuleSignalTypes(
  reviewInsightTags: ReviewInsightTag[] | undefined | null
): ReviewInsightTag[] {
  return reviewInsightTags ?? [];
}

// ─── Effectiveness Scoring ───

const MIN_SIGNAL_VOLUME = 3;

export function computeEffectiveness(input: EffectivenessInput): EffectivenessOutput {
  const { baselineCount, postCount } = input;

  // Insufficient data check
  if (baselineCount < MIN_SIGNAL_VOLUME && postCount < MIN_SIGNAL_VOLUME) {
    return {
      deltaCount: postCount - baselineCount,
      deltaPercent: 0,
      resultStatus: "insufficient_data",
      confidenceLevel: "low",
      score: "insufficient",
      label: "Insufficient Data",
      recommendation: getRecommendation("insufficient"),
    };
  }

  const deltaCount = postCount - baselineCount;
  const deltaPercent = baselineCount > 0
    ? Math.round(((postCount - baselineCount) / baselineCount) * 100)
    : (postCount > 0 ? 100 : 0);

  const score = classifyScore(deltaPercent, baselineCount, postCount);
  const resultStatus = scoreToResult(score);
  const confidenceLevel = computeConfidence(baselineCount, postCount, deltaPercent);

  return {
    deltaCount,
    deltaPercent,
    resultStatus,
    confidenceLevel,
    score,
    label: SCORE_LABELS[score],
    recommendation: getRecommendation(score),
  };
}

function classifyScore(deltaPercent: number, baseline: number, post: number): EffectivenessScore {
  if (baseline < MIN_SIGNAL_VOLUME && post < MIN_SIGNAL_VOLUME) return "insufficient";
  if (deltaPercent <= -40) return "strong_positive";
  if (deltaPercent < -15) return "positive";
  if (deltaPercent >= -15 && deltaPercent <= 15) return "neutral";
  return "negative";
}

function scoreToResult(score: EffectivenessScore): EffectivenessResult {
  switch (score) {
    case "strong_positive":
    case "positive":
      return "improved";
    case "neutral":
      return "unchanged";
    case "negative":
      return "worsened";
    case "insufficient":
      return "insufficient_data";
  }
}

export const SCORE_LABELS: Record<EffectivenessScore, string> = {
  strong_positive: "Strong Improvement",
  positive: "Improvement",
  neutral: "No Meaningful Change",
  negative: "Performance Declined",
  insufficient: "Insufficient Data",
};

export const RESULT_LABELS: Record<EffectivenessResult, string> = {
  improved: "Improved",
  unchanged: "Unchanged",
  worsened: "Worsened",
  insufficient_data: "Insufficient Data",
};

export const RESULT_COLORS: Record<EffectivenessResult, string> = {
  improved: "text-success",
  unchanged: "text-muted-foreground",
  worsened: "text-destructive",
  insufficient_data: "text-muted-foreground",
};

export const SCORE_COLORS: Record<EffectivenessScore, string> = {
  strong_positive: "bg-success/10 text-success",
  positive: "bg-success/10 text-success",
  neutral: "bg-muted text-muted-foreground",
  negative: "bg-destructive/10 text-destructive",
  insufficient: "bg-muted text-muted-foreground",
};

// ─── Confidence Rules ───

function computeConfidence(baseline: number, post: number, deltaPercent: number): ConfidenceLevel {
  const totalVolume = baseline + post;
  const absChange = Math.abs(deltaPercent);

  // High: enough volume on both sides + clear directional change
  if (baseline >= 8 && post >= 8 && absChange >= 25) return "high";

  // Medium: moderate volume or one clear comparison
  if (totalVolume >= 10 && absChange >= 15) return "medium";

  return "low";
}

// ─── Recommendation Engine ───

function getRecommendation(score: EffectivenessScore): string {
  switch (score) {
    case "strong_positive":
      return "Training is delivering strong results. Keep current module. Consider using as a model for similar standards.";
    case "positive":
      return "Training is showing improvement. Monitor next evaluation window to confirm sustained progress.";
    case "neutral":
      return "No meaningful change detected. Review delivery quality and check whether staff actually completed training. Consider refresher assignment.";
    case "negative":
      return "Performance declined after training. Review module content and evidence quality. Check whether signal mapping is accurate. Consider operational execution review.";
    case "insufficient":
      return "Not enough signal data to evaluate. Wait for more operational signal volume before drawing conclusions.";
  }
}

// ─── Aggregate Metrics ───

export interface EffectivenessMetrics {
  total: number;
  strongImprovement: number;
  improvement: number;
  noChange: number;
  declined: number;
  insufficientData: number;
}

export function computeEffectivenessMetrics(records: EffectivenessRecord[]): EffectivenessMetrics {
  const m: EffectivenessMetrics = {
    total: records.length,
    strongImprovement: 0,
    improvement: 0,
    noChange: 0,
    declined: 0,
    insufficientData: 0,
  };

  for (const r of records) {
    const score = classifyScore(r.delta_percent, r.baseline_signal_count, r.post_training_signal_count);
    switch (score) {
      case "strong_positive": m.strongImprovement++; break;
      case "positive": m.improvement++; break;
      case "neutral": m.noChange++; break;
      case "negative": m.declined++; break;
      case "insufficient": m.insufficientData++; break;
    }
  }

  return m;
}

/**
 * Get the most recent effectiveness record per module.
 */
export function getLatestByModule(records: EffectivenessRecord[]): Map<string, EffectivenessRecord> {
  const map = new Map<string, EffectivenessRecord>();
  for (const r of records) {
    const existing = map.get(r.module_id);
    if (!existing || new Date(r.measured_at) > new Date(existing.measured_at)) {
      map.set(r.module_id, r);
    }
  }
  return map;
}

/**
 * Group effectiveness records by location for location-level analysis.
 */
export function groupByLocation(records: EffectivenessRecord[]): Map<string, EffectivenessRecord[]> {
  const map = new Map<string, EffectivenessRecord[]>();
  for (const r of records) {
    const key = r.location_id ?? "all";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}
