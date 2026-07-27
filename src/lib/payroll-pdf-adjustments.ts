/**
 * Payroll PDF — "Rate & Service Charge Changes" section helpers.
 *
 * The accountant PDF must show ONLY:
 *   - hourly rate changes
 *   - service charge changes
 * for the SELECTED payroll period, ONE line per employee + field.
 *
 * All other adjustment categories (timesheet hours, imported hours overrides,
 * bonuses, holiday pay, internal-only rows) remain in `payroll_adjustments`
 * for internal audit but must NOT appear in the accountant-facing PDF.
 *
 * Pure module — no I/O, no mutations, safe to unit test.
 */

export interface RawPdfAdjustment {
  id: string;
  employee_id: string;
  employee_name: string;
  field_name: string;
  old_value: number | null;
  new_value: number | null;
  delta: number | null;
  note: string | null;
  created_at: string;
}

export interface PdfAdjustmentRow {
  id: string;
  employee_id: string;
  employee_name: string;
  field_name: "hourly_rate" | "service_charge";
  field_label: "Hourly Rate" | "Service Charge";
  from_value: number | null;
  to_value: number | null;
  reason: string;
  created_at: string;
}

/** Only these two categories are accountant-facing. */
export const PDF_ADJUSTMENT_FIELDS = ["hourly_rate", "service_charge"] as const;

const FIELD_LABEL: Record<(typeof PDF_ADJUSTMENT_FIELDS)[number], PdfAdjustmentRow["field_label"]> = {
  hourly_rate: "Hourly Rate",
  service_charge: "Service Charge",
};

/**
 * Filter + dedupe raw payroll_adjustments to accountant-PDF rows.
 *
 * Rules:
 *  - Keep only `hourly_rate` and `service_charge`.
 *  - One row per (employee_id, field_name) — from = earliest `old_value`,
 *    to = latest `new_value`, reason = latest non-empty note, date = latest.
 *  - Rows where the net movement is zero (from == to) are dropped: they carry
 *    no accountant-facing information.
 *  - Input is assumed to already be scoped to the selected payroll period
 *    (the hook filters by `payroll_period_id`). This function does not
 *    re-filter by period so it stays a pure transform.
 */
export function buildPdfAdjustmentRows(raw: RawPdfAdjustment[]): PdfAdjustmentRow[] {
  const allowed = new Set<string>(PDF_ADJUSTMENT_FIELDS);
  const groups = new Map<string, RawPdfAdjustment[]>();
  for (const r of raw) {
    if (!allowed.has(r.field_name)) continue;
    const key = `${r.employee_id}::${r.field_name}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const rows: PdfAdjustmentRow[] = [];
  for (const [, list] of groups) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const from_value = first.old_value;
    const to_value = last.new_value;
    // Drop no-op movements (e.g. edited and reverted within the period).
    if (from_value !== null && to_value !== null && Number(from_value) === Number(to_value)) {
      continue;
    }
    const reason =
      [...sorted].reverse().map((r) => (r.note ?? "").trim()).find((s) => s.length > 0) ?? "";
    rows.push({
      id: last.id,
      employee_id: last.employee_id,
      employee_name: last.employee_name,
      field_name: last.field_name as PdfAdjustmentRow["field_name"],
      field_label: FIELD_LABEL[last.field_name as (typeof PDF_ADJUSTMENT_FIELDS)[number]],
      from_value,
      to_value,
      reason,
      created_at: last.created_at,
    });
  }

  // Stable ordering — employee name, then field label.
  rows.sort((a, b) => {
    const n = a.employee_name.localeCompare(b.employee_name);
    if (n !== 0) return n;
    return a.field_label.localeCompare(b.field_label);
  });
  return rows;
}

export interface PdfAdjustmentSummary {
  /** Rows the accountant will see on the PDF. */
  pdf_rows: number;
  /** Raw internal-audit rows in this period that are NOT printed. */
  internal_hidden: number;
}

export function summarisePdfAdjustments(
  raw: RawPdfAdjustment[],
  pdfRows: PdfAdjustmentRow[],
): PdfAdjustmentSummary {
  return {
    pdf_rows: pdfRows.length,
    internal_hidden: Math.max(0, raw.length - pdfRows.length),
  };
}
