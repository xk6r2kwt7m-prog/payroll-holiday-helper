/**
 * Module-to-Signal Mapping — auto-derivation & resolution utilities.
 *
 * Derives signal tags from existing standards_metadata fields
 * and resolves the final active mapping set per module
 * (manual overrides auto where conflicts exist).
 */

import type {
  StandardsMetadata,
  ReviewInsightTag,
  CustomerImpactArea,
} from "@/data/training-standards/types";

// ─── Signal tag taxonomy ───

/**
 * All known signal tags the system supports.
 * Tags sourced from ReviewInsightTag, CustomerImpactArea derivations,
 * and additional operational categories.
 */
export const SIGNAL_TAG_LABELS: Record<string, string> = {
  // From ReviewInsightTag (direct 1:1)
  recurring_delay_issue: "Recurring Delays",
  staff_attitude_issue: "Staff Attitude",
  food_temperature_issue: "Food Temperature",
  cleanliness_issue: "Cleanliness",
  allergen_confidence_issue: "Allergen Confidence",
  complaint_recovery_issue: "Complaint Recovery",
  ambience_issue: "Ambience",
  value_for_money_issue: "Value for Money",
  // Derived from CustomerImpactArea
  speed_issue: "Speed of Service",
  communication_issue: "Communication",
  quality_issue: "Food / Drink Quality",
  // Operational categories
  qa_audit_failure: "QA Audit Failure",
  incident_report: "Incident Report",
  food_safety_issue: "Food Safety",
  conduct_issue: "Conduct Issue",
  customer_complaint: "Customer Complaint",
};

export const ALL_SIGNAL_TAGS = Object.keys(SIGNAL_TAG_LABELS);

export function getSignalTagLabel(tag: string): string {
  return SIGNAL_TAG_LABELS[tag] ?? tag.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── CustomerImpactArea → signal_tag map ───

const IMPACT_TO_SIGNAL: Record<CustomerImpactArea, string> = {
  speed: "recurring_delay_issue",
  communication: "communication_issue",
  quality: "quality_issue",
  cleanliness: "cleanliness_issue",
  allergen_confidence: "allergen_confidence_issue",
  complaint_recovery: "complaint_recovery_issue",
  ambience: "ambience_issue",
  value_perception: "value_for_money_issue",
};

// ─── Auto-derivation ───

/**
 * Derives signal tags from a module's standards_metadata.
 * Returns a deduplicated set of signal tag strings.
 */
export function deriveSignalTags(meta: StandardsMetadata | null | undefined): string[] {
  if (!meta) return [];

  const tags = new Set<string>();

  // 1. Direct from review_insight_tags
  if (meta.review_insight_tags) {
    for (const tag of meta.review_insight_tags) {
      tags.add(tag);
    }
  }

  // 2. From customer_impact_areas
  if (meta.customer_impact_areas) {
    for (const area of meta.customer_impact_areas) {
      const mapped = IMPACT_TO_SIGNAL[area];
      if (mapped) tags.add(mapped);
    }
  }

  // 3. High-risk modules with allergen or food safety themes
  if (meta.service_risk_level === "high") {
    if (meta.operational_area === "boh") {
      tags.add("food_safety_issue");
    }
  }

  return Array.from(tags).sort();
}

// ─── Mapping resolution ───

export type MappingSource = "auto" | "manual";

export interface SignalMapping {
  id: string;
  module_id: string;
  signal_tag: string;
  mapping_source: MappingSource;
  is_active: boolean;
  priority: number;
  notes: string | null;
  created_by: string | null;
}

export interface ResolvedMapping {
  signal_tag: string;
  source: MappingSource;
  is_active: boolean;
  priority: number;
  /** The DB record id (null for auto-derived not yet persisted) */
  record_id: string | null;
  notes: string | null;
}

/**
 * Resolves the final set of mappings for a module.
 * Manual mappings override auto mappings for the same signal_tag.
 * Inactive mappings are included but flagged.
 */
export function resolveModuleMappings(
  autoTags: string[],
  dbMappings: SignalMapping[],
): ResolvedMapping[] {
  const resolved = new Map<string, ResolvedMapping>();

  // 1. Seed with auto-derived tags (lowest priority)
  for (const tag of autoTags) {
    resolved.set(tag, {
      signal_tag: tag,
      source: "auto",
      is_active: true,
      priority: 0,
      record_id: null,
      notes: null,
    });
  }

  // 2. Layer DB records — auto records first, then manual (manual wins)
  const sorted = [...dbMappings].sort((a, b) => {
    // Process auto before manual so manual overwrites
    if (a.mapping_source === "auto" && b.mapping_source === "manual") return -1;
    if (a.mapping_source === "manual" && b.mapping_source === "auto") return 1;
    return 0;
  });

  for (const m of sorted) {
    resolved.set(m.signal_tag, {
      signal_tag: m.signal_tag,
      source: m.mapping_source,
      is_active: m.is_active,
      priority: m.priority,
      record_id: m.id,
      notes: m.notes,
    });
  }

  // Sort by priority desc, then tag name
  return Array.from(resolved.values()).sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.signal_tag.localeCompare(b.signal_tag);
  });
}

/**
 * Returns only the active signal tags for a module (for effectiveness calculations).
 */
export function getActiveSignalTags(
  autoTags: string[],
  dbMappings: SignalMapping[],
): string[] {
  return resolveModuleMappings(autoTags, dbMappings)
    .filter(m => m.is_active)
    .map(m => m.signal_tag);
}
