/**
 * Imported Hours Override — pure helpers for the "manager corrected
 * timesheet hours after import" flow. No mutations, no I/O.
 *
 * Data model reuses:
 *   - payroll_entries.imported_hours (original hours from uploaded file)
 *   - payroll_entries.timesheet_hours (current, possibly corrected)
 *   - payroll_entries.adjustment_note (composite reason on the entry)
 *   - payroll_adjustments (immutable audit row with field_name='timesheet_hours')
 *   - payroll_period_notes (optional manager note, may be flagged show_on_pdf)
 */

export const OVERRIDE_REASON_CATEGORIES = [
  { value: "timesheet_file_error", label: "Timesheet file error" },
  { value: "clock_in_out_issue", label: "Clock-in / clock-out issue" },
  { value: "agreed_correction", label: "Manual correction agreed" },
  { value: "duplicate_or_missing_shift", label: "Duplicate / missing shift" },
  { value: "unpaid_break", label: "Unpaid break correction" },
  { value: "manager_adjustment", label: "Manager adjustment" },
  { value: "other", label: "Other" },
] as const;

export type OverrideReasonCategory =
  (typeof OVERRIDE_REASON_CATEGORIES)[number]["value"];

export function isValidOverrideCategory(
  v: string | null | undefined,
): v is OverrideReasonCategory {
  return !!v && OVERRIDE_REASON_CATEGORIES.some((c) => c.value === v);
}

export function categoryLabel(cat: OverrideReasonCategory | string | null): string {
  if (!cat) return "";
  const hit = OVERRIDE_REASON_CATEGORIES.find((c) => c.value === cat);
  return hit ? hit.label : cat;
}

/** Deterministic composite note used in payroll_entries.adjustment_note
 *  and mirrored into payroll_adjustments.note / payroll_period_notes.note. */
export function formatOverrideNote(input: {
  imported: number;
  corrected: number;
  category: OverrideReasonCategory;
  freeText?: string | null;
}): string {
  const imp = Number(input.imported).toFixed(2);
  const cur = Number(input.corrected).toFixed(2);
  const label = categoryLabel(input.category);
  const base = `Timesheet hours manually changed from ${imp} to ${cur} after import. Reason: ${label}`;
  const extra = (input.freeText ?? "").trim();
  return extra ? `${base} — ${extra}` : `${base}.`;
}

/** Pure guard: is this save allowed? Returns null on OK, or an error string. */
export function validateOverride(input: {
  category: OverrideReasonCategory | null | undefined;
  imported: number;
  corrected: number;
}): string | null {
  if (!isValidOverrideCategory(input.category ?? null)) {
    return "Select a reason category before saving.";
  }
  if (!Number.isFinite(input.imported) || !Number.isFinite(input.corrected)) {
    return "Hours must be numeric.";
  }
  if (Math.abs(input.imported - input.corrected) < 0.001) {
    return "No change to imported hours.";
  }
  return null;
}

export interface CountableEntry {
  id: string;
  employee_id: string;
  imported_hours: number | null;
}
export interface CountableAdjustment {
  payroll_entry_id: string;
  field_name: string;
}

/**
 * Count distinct employees who had a `timesheet_hours` adjustment applied
 * to an entry that originated from an uploaded timesheet (imported_hours
 * is not null). Used by the approval checklist warning.
 */
export function countImportedHoursOverrides(
  entries: CountableEntry[],
  adjustments: CountableAdjustment[],
): { count: number; employee_ids: string[] } {
  const entryToEmp = new Map<string, string>();
  const hasImported = new Set<string>();
  for (const e of entries) {
    entryToEmp.set(e.id, e.employee_id);
    if (e.imported_hours != null) hasImported.add(e.id);
  }
  const emps = new Set<string>();
  for (const a of adjustments) {
    if (a.field_name !== "timesheet_hours") continue;
    if (!hasImported.has(a.payroll_entry_id)) continue;
    const emp = entryToEmp.get(a.payroll_entry_id);
    if (emp) emps.add(emp);
  }
  return { count: emps.size, employee_ids: [...emps] };
}

/** Normalise for duplicate-note detection (whitespace + case). */
export function normaliseNoteForDedup(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isDuplicateNote(
  incoming: string,
  existing: { note: string }[],
): boolean {
  const n = normaliseNoteForDedup(incoming);
  return existing.some((e) => normaliseNoteForDedup(e.note ?? "") === n);
}
