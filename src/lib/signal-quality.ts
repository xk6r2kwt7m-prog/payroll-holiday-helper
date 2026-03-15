/**
 * Signal Quality Control Engine
 *
 * Deterministic classification of operational signal quality for the
 * governance, effectiveness, and recommendation layers.
 *
 * Purely computational — no database queries.
 */

import { differenceInDays, parseISO } from "date-fns";
import { STALE_REVIEW_THRESHOLD_DAYS } from "@/lib/review-governance";
import type { ReviewInsight } from "@/hooks/useReviewInsights";

// ─── Types ───

export type SignalQualityStatus = "strong" | "acceptable" | "weak" | "unreliable";
export type SignalConfidence = "high" | "medium" | "low";
export type DuplicateRisk = "low" | "medium" | "high";
export type EvidenceStrength = "strong" | "moderate" | "weak";
export type VolumeLevel = "high" | "medium" | "low";
export type AttributionStrength = "strong" | "partial" | "weak";

export interface SignalQualityRecord {
  moduleId: string;
  signalType: string;
  qualityStatus: SignalQualityStatus;
  confidenceLevel: SignalConfidence;
  duplicateRisk: DuplicateRisk;
  evidenceStrength: EvidenceStrength;
  volumeLevel: VolumeLevel;
  vaguenessFlag: boolean;
  attributionStrength: AttributionStrength;
  topWeakness: string;
  recommendation: string;
  /** Dimensional scores 0–100 for internal computation */
  scores: SignalDimensionScores;
}

export interface SignalDimensionScores {
  volume: number;
  specificity: number;
  attribution: number;
  recency: number;
  sourceStrength: number;
  duplicatePenalty: number;
  /** Weighted composite */
  composite: number;
}

/** Input needed to assess one module's signal quality */
export interface SignalQualityInput {
  moduleId: string;
  insights: ReviewInsight[];
  evidenceCount: number;
  insightCount: number;
  /** All insight tags across the tenant for duplicate detection */
  allInsightsByTag?: Map<string, ReviewInsight[]>;
}

// ─── Constants ───

const VOLUME_THRESHOLDS = { high: 5, medium: 2 };
const STALE_SIGNAL_DAYS = STALE_REVIEW_THRESHOLD_DAYS; // 180 days, same as review
const COMPOSITE_BANDS: [number, SignalQualityStatus][] = [
  [70, "strong"],
  [45, "acceptable"],
  [25, "weak"],
  [0, "unreliable"],
];

// ─── Source strength weighting ───

const SOURCE_STRENGTH_MAP: Record<string, number> = {
  "incident_log": 95,
  "qa_audit": 85,
  "manager_observation": 80,
  "structured_qa": 75,
  "google": 50,
  "tripadvisor": 50,
  "trustpilot": 50,
  "deliveroo": 45,
  "uber_eats": 45,
  "just_eat": 45,
  "internal_feedback": 60,
};

function getSourceScore(channel: string | null): number {
  if (!channel) return 30;
  const normalised = channel.toLowerCase().replace(/\s+/g, "_");
  return SOURCE_STRENGTH_MAP[normalised] ?? 40;
}

// ─── Core scoring ───

export function assessSignalQuality(input: SignalQualityInput): SignalQualityRecord {
  const { moduleId, insights, evidenceCount, insightCount, allInsightsByTag } = input;
  const activeInsights = insights.filter(i => i.is_active);

  // Volume score
  const totalSignals = evidenceCount + insightCount;
  const volumeScore =
    totalSignals >= VOLUME_THRESHOLDS.high ? 100 :
    totalSignals >= VOLUME_THRESHOLDS.medium ? 60 : 20;
  const volumeLevel: VolumeLevel =
    volumeScore >= 80 ? "high" : volumeScore >= 50 ? "medium" : "low";

  // Specificity score (inverse vagueness)
  const specificityScore = computeSpecificity(activeInsights);
  const vaguenessFlag = specificityScore < 40;

  // Attribution score
  const attributionScore = computeAttribution(activeInsights, evidenceCount);
  const attributionStrength: AttributionStrength =
    attributionScore >= 70 ? "strong" : attributionScore >= 40 ? "partial" : "weak";

  // Recency score
  const recencyScore = computeRecency(activeInsights);

  // Source strength score
  const sourceStrengthScore = computeSourceStrength(activeInsights);
  const evidenceStrength: EvidenceStrength =
    sourceStrengthScore >= 70 ? "strong" : sourceStrengthScore >= 40 ? "moderate" : "weak";

  // Duplicate penalty
  const { penalty: duplicatePenalty, risk: duplicateRisk } = computeDuplicateRisk(activeInsights, allInsightsByTag);

  // Composite score
  const composite = Math.round(
    (volumeScore * 0.20) +
    (specificityScore * 0.20) +
    (attributionScore * 0.15) +
    (recencyScore * 0.15) +
    (sourceStrengthScore * 0.15) -
    (duplicatePenalty * 0.15)
  );

  const qualityStatus = classifyComposite(composite);
  const confidenceLevel: SignalConfidence =
    composite >= 65 ? "high" : composite >= 40 ? "medium" : "low";

  const scores: SignalDimensionScores = {
    volume: volumeScore,
    specificity: specificityScore,
    attribution: attributionScore,
    recency: recencyScore,
    sourceStrength: sourceStrengthScore,
    duplicatePenalty,
    composite,
  };

  const topWeakness = identifyTopWeakness(scores, vaguenessFlag, duplicateRisk, volumeLevel);
  const recommendation = getQualityRecommendation(qualityStatus, topWeakness);

  return {
    moduleId,
    signalType: activeInsights[0]?.insight_tag ?? "unknown",
    qualityStatus,
    confidenceLevel,
    duplicateRisk,
    evidenceStrength,
    volumeLevel,
    vaguenessFlag,
    attributionStrength,
    topWeakness,
    recommendation,
    scores,
  };
}

// ─── Dimension computations ───

function computeSpecificity(insights: ReviewInsight[]): number {
  if (insights.length === 0) return 0;
  let totalScore = 0;
  for (const ins of insights) {
    let score = 30; // base
    if (ins.operational_problem?.trim()) score += 20;
    if (ins.customer_impact?.trim()) score += 20;
    if (ins.suggested_training_response?.trim()) score += 15;
    if (ins.summary && ins.summary.length > 40) score += 15;
    totalScore += Math.min(score, 100);
  }
  return Math.round(totalScore / insights.length);
}

function computeAttribution(insights: ReviewInsight[], evidenceCount: number): number {
  if (insights.length === 0 && evidenceCount === 0) return 0;
  let score = 0;
  // Evidence backing adds attribution
  if (evidenceCount >= 3) score += 40;
  else if (evidenceCount >= 1) score += 20;
  // Insight quality adds attribution
  const withProblem = insights.filter(i => i.operational_problem?.trim()).length;
  const withResponse = insights.filter(i => i.suggested_training_response?.trim()).length;
  if (insights.length > 0) {
    score += Math.round((withProblem / insights.length) * 30);
    score += Math.round((withResponse / insights.length) * 30);
  }
  return Math.min(score, 100);
}

function computeRecency(insights: ReviewInsight[]): number {
  if (insights.length === 0) return 0;
  const now = new Date();
  let recentCount = 0;
  let staleCount = 0;
  for (const ins of insights) {
    const days = differenceInDays(now, parseISO(ins.created_at));
    if (days <= 90) recentCount++;
    else if (days > STALE_SIGNAL_DAYS) staleCount++;
  }
  const recentRatio = recentCount / insights.length;
  const staleRatio = staleCount / insights.length;
  // Recent signals boost, stale penalise
  return Math.round(Math.max(0, Math.min(100, recentRatio * 80 + 20 - staleRatio * 40)));
}

function computeSourceStrength(insights: ReviewInsight[]): number {
  if (insights.length === 0) return 0;
  let total = 0;
  for (const ins of insights) {
    total += getSourceScore(ins.review_channel);
  }
  return Math.round(total / insights.length);
}

function computeDuplicateRisk(
  insights: ReviewInsight[],
  allInsightsByTag?: Map<string, ReviewInsight[]>,
): { penalty: number; risk: DuplicateRisk } {
  if (insights.length <= 1) return { penalty: 0, risk: "low" };

  let dupeSignals = 0;

  // Check within module: same tag + similar date window (within 7 days)
  for (let i = 0; i < insights.length; i++) {
    for (let j = i + 1; j < insights.length; j++) {
      const a = insights[i];
      const b = insights[j];
      if (a.insight_tag === b.insight_tag) {
        const dayDiff = Math.abs(differenceInDays(parseISO(a.created_at), parseISO(b.created_at)));
        if (dayDiff <= 7) dupeSignals++;
      }
    }
  }

  // Also check cross-module if data available
  if (allInsightsByTag) {
    for (const ins of insights) {
      const sameTagAll = allInsightsByTag.get(ins.insight_tag) ?? [];
      const crossModuleDupes = sameTagAll.filter(other =>
        other.id !== ins.id &&
        other.document_id !== ins.document_id &&
        Math.abs(differenceInDays(parseISO(other.created_at), parseISO(ins.created_at))) <= 7
      );
      dupeSignals += crossModuleDupes.length;
    }
  }

  const penalty = Math.min(100, dupeSignals * 20);
  const risk: DuplicateRisk = penalty >= 40 ? "high" : penalty >= 15 ? "medium" : "low";
  return { penalty, risk };
}

function classifyComposite(composite: number): SignalQualityStatus {
  for (const [threshold, status] of COMPOSITE_BANDS) {
    if (composite >= threshold) return status;
  }
  return "unreliable";
}

// ─── Weakness identification ───

function identifyTopWeakness(
  scores: SignalDimensionScores,
  vagueness: boolean,
  dupeRisk: DuplicateRisk,
  volumeLevel: VolumeLevel,
): string {
  const weaknesses: { score: number; label: string }[] = [
    { score: scores.volume, label: "low signal volume" },
    { score: scores.specificity, label: "vague signal descriptions" },
    { score: scores.attribution, label: "weak training linkage" },
    { score: scores.recency, label: "stale signals" },
    { score: scores.sourceStrength, label: "weak source channels" },
  ];

  if (dupeRisk === "high") return "high duplicate risk across signals";
  if (vagueness) return "vague signal descriptions — insufficient detail for training decisions";

  // Return the worst-scoring dimension
  weaknesses.sort((a, b) => a.score - b.score);
  return weaknesses[0]?.label ?? "no specific weakness identified";
}

// ─── Recommendations ───

const QUALITY_RECOMMENDATIONS: Record<SignalQualityStatus, string> = {
  strong: "Safe to use for governance and effectiveness evaluation.",
  acceptable: "Monitor and continue collecting evidence. Signal quality is adequate for directional conclusions.",
  weak: "Add structured evidence and improve review insight quality. Avoid strong operational conclusions.",
  unreliable: "Do not use as a basis for training effectiveness judgement yet. Gather more reliable signals first.",
};

const WEAKNESS_RECOMMENDATIONS: Record<string, string> = {
  "low signal volume": " Gather more operational signals before evaluating training impact.",
  "vague signal descriptions": " Improve review insight specificity — require operational problem, customer impact, and training response.",
  "weak training linkage": " Strengthen the link between signals and training modules with evidence sources.",
  "stale signals": " Collect recent operational data. Current signals are outdated.",
  "weak source channels": " Prioritise structured sources (QA audits, incident logs) over isolated reviews.",
  "high duplicate risk across signals": " Review signal overlap before acting — likely counting the same issues multiple times.",
};

function getQualityRecommendation(status: SignalQualityStatus, topWeakness: string): string {
  let rec = QUALITY_RECOMMENDATIONS[status];
  // Look for matching weakness recommendation
  for (const [key, extra] of Object.entries(WEAKNESS_RECOMMENDATIONS)) {
    if (topWeakness.includes(key)) {
      rec += extra;
      break;
    }
  }
  return rec;
}

// ─── Aggregate metrics ───

export interface SignalQualityMetrics {
  total: number;
  strong: number;
  acceptable: number;
  weak: number;
  unreliable: number;
  highDuplicateRisk: number;
  weakAttribution: number;
  lowVolume: number;
  vagueSignals: number;
}

export function computeSignalQualityMetrics(records: SignalQualityRecord[]): SignalQualityMetrics {
  const m: SignalQualityMetrics = {
    total: records.length, strong: 0, acceptable: 0, weak: 0, unreliable: 0,
    highDuplicateRisk: 0, weakAttribution: 0, lowVolume: 0, vagueSignals: 0,
  };
  for (const r of records) {
    m[r.qualityStatus]++;
    if (r.duplicateRisk === "high") m.highDuplicateRisk++;
    if (r.attributionStrength === "weak") m.weakAttribution++;
    if (r.volumeLevel === "low") m.lowVolume++;
    if (r.vaguenessFlag) m.vagueSignals++;
  }
  return m;
}

// ─── Effectiveness confidence adjustment ───

/**
 * Adjusts an effectiveness confidence level based on signal quality.
 * If signal quality is weak/unreliable, downgrade confidence.
 */
export function adjustEffectivenessConfidence(
  effectivenessConfidence: "high" | "medium" | "low",
  signalQuality: SignalQualityStatus,
): "high" | "medium" | "low" {
  if (signalQuality === "unreliable") return "low";
  if (signalQuality === "weak") {
    if (effectivenessConfidence === "high") return "medium";
    return effectivenessConfidence;
  }
  return effectivenessConfidence;
}

/**
 * Generate quality-adjusted recommendation for effectiveness.
 */
export function getQualityAdjustedRecommendation(
  effectivenessRecommendation: string,
  signalQuality: SignalQualityStatus,
): string {
  if (signalQuality === "strong" || signalQuality === "acceptable") {
    return effectivenessRecommendation;
  }
  if (signalQuality === "unreliable") {
    return `⚠ Limited signal quality — ${effectivenessRecommendation.toLowerCase()} This conclusion is directional only due to unreliable signal data.`;
  }
  // weak
  return `⚠ Weak signal quality — ${effectivenessRecommendation.toLowerCase()} Consider gathering more structured evidence before acting on this result.`;
}

export const QUALITY_STATUS_COLORS: Record<SignalQualityStatus, string> = {
  strong: "bg-success/10 text-success",
  acceptable: "bg-primary/10 text-primary",
  weak: "bg-warning/10 text-warning",
  unreliable: "bg-destructive/10 text-destructive",
};

export const QUALITY_STATUS_LABELS: Record<SignalQualityStatus, string> = {
  strong: "Strong",
  acceptable: "Acceptable",
  weak: "Weak",
  unreliable: "Unreliable",
};
