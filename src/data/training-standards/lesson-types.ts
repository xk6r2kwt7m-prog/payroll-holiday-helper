/**
 * Lesson Content Types — structured, source-backed training content.
 *
 * Every teaching point must be traceable to a verified source.
 * Three-tier classification prevents conflation of law, guidance, and internal rules.
 */

/** How a fact is classified for display and audit */
export type SourceClassification =
  | "legal_requirement"
  | "official_guidance"
  | "internal_standard";

export const SOURCE_CLASSIFICATION_LABELS: Record<SourceClassification, string> = {
  legal_requirement: "Legal Requirement",
  official_guidance: "Official Guidance",
  internal_standard: "Internal Company Standard",
};

export const SOURCE_CLASSIFICATION_COLORS: Record<SourceClassification, string> = {
  legal_requirement: "bg-destructive/10 text-destructive border-destructive/20",
  official_guidance: "bg-primary/10 text-primary border-primary/20",
  internal_standard: "bg-accent/10 text-accent-foreground border-accent/20",
};

/** A verified source backing lesson content */
export interface LessonSource {
  id: string;
  name: string;
  type: SourceClassification;
  jurisdiction?: string;
  url?: string;
  relevance: string;
}

/** A single teaching point traceable to a source */
export interface LessonPoint {
  text: string;
  classification: SourceClassification;
  source_id: string;
}

/** Section types for structured lesson rendering */
export type LessonSectionType =
  | "overview"
  | "why_this_matters"
  | "key_rules"
  | "step_by_step"
  | "common_mistakes"
  | "scenarios"
  | "expected_behaviours"
  | "manager_notes"
  | "learning_outcomes"
  | "emergency_response";

export const SECTION_TYPE_LABELS: Record<LessonSectionType, string> = {
  overview: "Overview",
  why_this_matters: "Why This Matters",
  key_rules: "Key Rules",
  step_by_step: "Step-by-Step Standard",
  common_mistakes: "Common Mistakes",
  scenarios: "Real Service Scenarios",
  expected_behaviours: "Expected Behaviours",
  manager_notes: "Manager Observation Points",
  learning_outcomes: "Learning Outcomes",
  emergency_response: "Emergency Response",
};

/** A section within the lesson */
export interface LessonSection {
  heading: string;
  type: LessonSectionType;
  /** Free-text paragraphs for overview/context */
  paragraphs?: string[];
  /** Traceable teaching points */
  points?: LessonPoint[];
  /** Whether this section is staff-visible (default true) */
  staff_visible?: boolean;
}

/** Complete lesson content for a module */
export interface LessonContent {
  /** Must match the module title for linking */
  module_title: string;
  version: string;
  last_reviewed: string;
  confidence_level: "high" | "medium" | "low";
  sources: LessonSource[];
  sections: LessonSection[];
  /** Points explicitly excluded due to lack of source support */
  excluded_points: string[];
  /** Known gaps that need further research */
  remaining_gaps: string[];
  /** Notes constraining what quiz questions can cover */
  quiz_support_notes: string[];
  refresher_recommendation: string;
  practical_signoff_points: string[];
  manager_observation_notes: string[];
}
