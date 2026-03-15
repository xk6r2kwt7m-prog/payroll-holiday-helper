/**
 * Shared validation utilities for evidence and review insight forms.
 * Admin-only — never used in staff-facing flows.
 */

// ─── URL validation ───

const URL_PATTERN = /^https?:\/\/.+\..+/i;

export function isValidUrl(url: string): boolean {
  if (!url.trim()) return true; // optional field
  return URL_PATTERN.test(url.trim());
}

// ─── Evidence form validation ───

export interface EvidenceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEvidenceForm(form: {
  source_title: string;
  evidence_type: string;
  confidence_level: string;
  source_url?: string;
  source_notes?: string;
  source_organisation?: string;
}): EvidenceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!form.source_title.trim() || form.source_title.trim().length < 5) {
    errors.push("Source title must be at least 5 characters.");
  }

  // URL format
  if (form.source_url && !isValidUrl(form.source_url)) {
    errors.push("URL must start with http:// or https://");
  }

  // Confidence quality warnings
  if (form.confidence_level === "high") {
    if (!form.source_organisation?.trim()) {
      warnings.push("High confidence usually requires a named source organisation.");
    }
    if (!form.source_notes?.trim() || form.source_notes.trim().length < 10) {
      warnings.push("High confidence evidence should include detailed notes.");
    }
    if (form.evidence_type === "internal_standard" || form.evidence_type === "incident_pattern") {
      warnings.push("High confidence is unusual for internal/incident sources — consider medium.");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Duplicate detection ───

export function isDuplicateEvidence(
  existingTitles: string[],
  newTitle: string
): boolean {
  const normalised = newTitle.trim().toLowerCase();
  return existingTitles.some(t => t.trim().toLowerCase() === normalised);
}

// ─── Review insight validation ───

const WEAK_SUMMARY_PATTERNS = [
  /^(bad|poor|good|great|ok|fine|service bad|customers? unhappy|not good|needs? work|improve)$/i,
  /^.{0,14}$/,  // too short (<15 chars)
];

export interface InsightValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateInsightForm(form: {
  summary: string;
  operational_problem?: string;
  customer_impact?: string;
  suggested_training_response?: string;
}): InsightValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const summary = form.summary.trim();

  if (!summary) {
    errors.push("Summary is required.");
  } else if (WEAK_SUMMARY_PATTERNS.some(p => p.test(summary))) {
    errors.push("Summary is too vague — describe the specific pattern observed.");
  }

  // Completeness warnings
  const missing: string[] = [];
  if (!form.operational_problem?.trim()) missing.push("operational problem");
  if (!form.customer_impact?.trim()) missing.push("customer impact");
  if (!form.suggested_training_response?.trim()) missing.push("training response");

  if (missing.length === 3) {
    errors.push("At least one of: operational problem, customer impact, or training response is required.");
  } else if (missing.length > 0) {
    warnings.push(`Consider adding: ${missing.join(", ")} for a complete insight.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
