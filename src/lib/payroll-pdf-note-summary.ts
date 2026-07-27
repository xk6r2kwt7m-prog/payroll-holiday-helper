/**
 * Payroll PDF note visibility summary — pure helpers.
 *
 * Managers set `show_on_pdf` per note in `payroll_period_notes`.
 * Before generating the accountant PDF we want a clear read of exactly
 * what the accountant will see: how many notes will appear and how many
 * are kept internal. This module owns that count — no I/O, no mutations.
 */

export interface PdfVisibilityNote {
  id: string;
  employee_id: string;
  category: string | null;
  show_on_pdf: boolean;
  note: string;
  created_at: string;
}

export interface PdfVisibilitySummary {
  total: number;
  pdf_visible: number;
  internal_only: number;
  /** Count of PDF-visible notes categorised as timesheet overrides. */
  pdf_visible_timesheet: number;
  /** Employees with at least one PDF-visible note. */
  pdf_visible_employees: number;
}

export function summarisePdfNoteVisibility(
  notes: PdfVisibilityNote[],
): PdfVisibilitySummary {
  const total = notes.length;
  let pdf_visible = 0;
  let pdf_visible_timesheet = 0;
  const pdfEmps = new Set<string>();
  for (const n of notes) {
    if (n.show_on_pdf) {
      pdf_visible++;
      if (n.category === "timesheet") pdf_visible_timesheet++;
      if (n.employee_id) pdfEmps.add(n.employee_id);
    }
  }
  return {
    total,
    pdf_visible,
    internal_only: total - pdf_visible,
    pdf_visible_timesheet,
    pdf_visible_employees: pdfEmps.size,
  };
}

/**
 * Return the most recent note for a given employee + category, if any.
 * Used by the adjustment-history drawer to show whether a matching
 * manager note exists for the field the accountant will see.
 */
export function latestNoteForCategory(
  notes: PdfVisibilityNote[],
  employeeId: string,
  category: string,
): PdfVisibilityNote | null {
  const scoped = notes.filter(
    (n) => n.employee_id === employeeId && n.category === category,
  );
  if (scoped.length === 0) return null;
  // notes may not be pre-sorted; pick the max created_at
  return scoped.reduce((a, b) =>
    new Date(a.created_at).getTime() >= new Date(b.created_at).getTime() ? a : b,
  );
}

/** Field name (payroll_adjustments) → note category (payroll_period_notes). */
export const FIELD_TO_NOTE_CATEGORY: Record<string, string> = {
  timesheet_hours: "timesheet",
  hourly_rate: "rate",
  service_charge: "service_charge",
  performance_bonus: "bonus",
  special_bonus: "bonus",
  holiday_pay: "holiday",
};
