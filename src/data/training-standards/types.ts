/**
 * UGLŌ Standards Framework — type definitions.
 *
 * These types describe the structured metadata stored in
 * training_library.standards_metadata (JSONB).
 *
 * All fields are optional so existing modules without
 * standards metadata continue to work unchanged.
 */

export type EvidenceBasis =
  | "official_guidance"
  | "review_pattern"
  | "internal_best_practice"
  | "mixed";

export type OperationalArea =
  | "foh"
  | "boh"
  | "management"
  | "all_staff";

export type ServiceRiskLevel = "low" | "medium" | "high";

export type CustomerImpactArea =
  | "speed"
  | "communication"
  | "quality"
  | "cleanliness"
  | "allergen_confidence"
  | "complaint_recovery"
  | "ambience"
  | "value_perception";

export type ReviewInsightTag =
  | "recurring_delay_issue"
  | "staff_attitude_issue"
  | "food_temperature_issue"
  | "cleanliness_issue"
  | "allergen_confidence_issue"
  | "complaint_recovery_issue"
  | "ambience_issue"
  | "value_for_money_issue";

/**
 * Shape of the `standards_metadata` JSONB column.
 */
export interface StandardsMetadata {
  evidence_basis?: EvidenceBasis;
  operational_area?: OperationalArea;
  service_risk_level?: ServiceRiskLevel;
  customer_impact_areas?: CustomerImpactArea[];
  review_insight_tags?: ReviewInsightTag[];
  learning_outcomes?: string[];
  quiz_themes?: string[];
  scenario_examples?: string[];
  why_this_matters?: string;
  operational_failures_prevented?: string[];
  /** Observable behaviours expected from trained staff */
  key_behaviours?: string[];
  /** Common ways this standard fails in practice */
  common_failure_points?: string[];
  /** What managers should look for during service to assess competence */
  manager_observation_points?: string[];
  /** Which roles this module is most relevant to */
  role_relevance?: string[];
}

/**
 * A module blueprint used for seeding platform standard modules.
 * Maps directly to a training_library insert row + standards_metadata.
 */
export interface ModuleBlueprint {
  title: string;
  summary: string;
  category: string;
  completion_type: "read_acknowledge" | "quiz" | "practical_signoff" | "blended";
  audience_scope: string;
  estimated_minutes: number;
  refresher_days: number | null;
  requires_quiz: boolean;
  is_mandatory: boolean;
  standards_metadata: StandardsMetadata;
}

// ── Label maps for UI display ──

export const EVIDENCE_BASIS_LABELS: Record<EvidenceBasis, string> = {
  official_guidance: "Official Guidance",
  review_pattern: "Review Pattern",
  internal_best_practice: "Internal Best Practice",
  mixed: "Mixed Sources",
};

export const OPERATIONAL_AREA_LABELS: Record<OperationalArea, string> = {
  foh: "Front of House",
  boh: "Back of House",
  management: "Management",
  all_staff: "All Staff",
};

export const SERVICE_RISK_LABELS: Record<ServiceRiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const CUSTOMER_IMPACT_LABELS: Record<CustomerImpactArea, string> = {
  speed: "Speed of Service",
  communication: "Communication",
  quality: "Food / Drink Quality",
  cleanliness: "Cleanliness",
  allergen_confidence: "Allergen Confidence",
  complaint_recovery: "Complaint Recovery",
  ambience: "Ambience",
  value_perception: "Value Perception",
};

export const REVIEW_INSIGHT_LABELS: Record<ReviewInsightTag, string> = {
  recurring_delay_issue: "Recurring Delays",
  staff_attitude_issue: "Staff Attitude",
  food_temperature_issue: "Food Temperature",
  cleanliness_issue: "Cleanliness",
  allergen_confidence_issue: "Allergen Confidence",
  complaint_recovery_issue: "Complaint Recovery",
  ambience_issue: "Ambience",
  value_for_money_issue: "Value for Money",
};
