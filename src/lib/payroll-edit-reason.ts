/**
 * Payroll Edit Reason + PDF Visibility
 *
 * Pure helpers that extend the existing imported-hours override pattern to
 * all editable payroll fields. No mutations, no I/O.
 *
 * Reuses:
 *   - payroll_adjustments (immutable audit) — written by caller
 *   - payroll_period_notes (manager notes, optional show_on_pdf) — written by caller
 *   - isDuplicateNote / normaliseNoteForDedup from payroll-hours-override
 */

import { formatCurrency, formatHours } from "@/hooks/useHolidays";

/** Manager-selectable reason categories for any payroll edit. */
export const EDIT_REASON_CATEGORIES = [
  { value: "rate_correction", label: "Rate correction" },
  { value: "service_charge_correction", label: "Service charge correction" },
  { value: "timesheet_correction", label: "Timesheet correction" },
  { value: "bonus_correction", label: "Bonus correction" },
  { value: "holiday_pay_correction", label: "Holiday pay correction" },
  { value: "manual_adjustment", label: "Manual adjustment" },
  { value: "other", label: "Other" },
] as const;

export type EditReasonCategory =
  (typeof EDIT_REASON_CATEGORIES)[number]["value"];

export function isValidEditReasonCategory(
  v: string | null | undefined,
): v is EditReasonCategory {
  return !!v && EDIT_REASON_CATEGORIES.some((c) => c.value === v);
}

export function editReasonLabel(cat: string | null | undefined): string {
  if (!cat) return "";
  const hit = EDIT_REASON_CATEGORIES.find((c) => c.value === cat);
  return hit ? hit.label : cat;
}

/**
 * Editable payroll fields that participate in the reason/PDF workflow.
 * Note: "manual_adjustment" is a catch-all for zero-hour payouts / retro pay
 * lines that don't fit a specific field.
 */
export type EditableField =
  | "timesheet_hours"
  | "hourly_rate"
  | "service_charge"
  | "performance_bonus"
  | "special_bonus"
  | "holiday_pay"
  | "manual_adjustment";

/**
 * Maps an edited field to the `payroll_period_notes.category` string used
 * when persisting the manager note. Kept short and stable so the PDF
 * grouping stays consistent.
 */
export const EDIT_FIELD_TO_NOTE_CATEGORY: Record<EditableField, string> = {
  timesheet_hours: "timesheet",
  hourly_rate: "rate",
  service_charge: "service_charge",
  performance_bonus: "bonus",
  special_bonus: "bonus",
  holiday_pay: "holiday",
  manual_adjustment: "manual_adjustment",
};

export function noteCategoryForField(field: EditableField): string {
  return EDIT_FIELD_TO_NOTE_CATEGORY[field] ?? "other";
}

/** Human label for a field, used in the confirmation modal. */
export const EDITABLE_FIELD_LABEL: Record<EditableField, string> = {
  timesheet_hours: "Timesheet hours",
  hourly_rate: "Hourly rate",
  service_charge: "Service charge",
  performance_bonus: "Performance bonus",
  special_bonus: "Special bonus",
  holiday_pay: "Holiday pay",
  manual_adjustment: "Manual adjustment",
};

export interface FieldChange {
  field: EditableField;
  previous: number;
  next: number;
}

/** Format a single field-change line for a manager-facing note. */
export function formatFieldChange(fc: FieldChange): string {
  const label = EDITABLE_FIELD_LABEL[fc.field];
  const fmt = fc.field === "timesheet_hours" ? formatHours : formatCurrency;
  const diff = fc.next - fc.previous;
  const sign = diff >= 0 ? "+" : "";
  return `${label}: ${fmt(fc.previous)} → ${fmt(fc.next)} (${sign}${fmt(diff)})`;
}

/**
 * Deterministic composite note stored in payroll_period_notes.note when
 * the manager chooses to publish the reason on the PDF. Includes every
 * field that changed, plus the selected reason category and optional
 * free-text context.
 */
export function formatEditReasonNote(input: {
  changes: FieldChange[];
  category: EditReasonCategory;
  freeText?: string | null;
}): string {
  const lines = input.changes.map(formatFieldChange).join("; ");
  const reason = editReasonLabel(input.category);
  const base = `${lines}. Reason: ${reason}`;
  const extra = (input.freeText ?? "").trim();
  return extra ? `${base} — ${extra}.` : `${base}.`;
}

/** Pure guard: does this save satisfy the reason requirement? */
export function validateEditReason(input: {
  changes: FieldChange[];
  category: EditReasonCategory | null | undefined;
}): string | null {
  if (input.changes.length === 0) return "No changes to save.";
  if (!isValidEditReasonCategory(input.category ?? null)) {
    return "Select a reason category before saving.";
  }
  return null;
}
