## Imported Hours Override — Reason Required & Change Record

Most of the plumbing already exists (`payroll_entries.imported_hours`, `adjustment_note`, `payroll_adjustments` audit table with `field_name/old/new/note/changed_by`, adjustment-history drawer, existing note dialog on edit, DB trigger `trg_protect_approved_payroll_entries`). This work sharpens the flow specifically for imported-hours changes, adds a required reason category, and surfaces the change in the approval checklist and (optionally) the PDF.

### Changes

1. **New helper `src/lib/payroll-hours-override.ts`**
   - `OVERRIDE_REASON_CATEGORIES` constant list (timesheet_file_error, clock_in_out_issue, agreed_correction, duplicate_or_missing_shift, unpaid_break, manager_adjustment, other).
   - `formatOverrideNote({ imported, corrected, category, freeText })` → deterministic string, e.g. `"Timesheet hours manually changed from 32.50 to 30.00 after import. Reason: Unpaid break correction — <freeText>"`.
   - `countImportedHoursOverrides(entries, adjustments)` used by checklist.

2. **`src/components/payroll/EditablePayrollTable.tsx`**
   - When `hoursChanged && entry.imported_hours != null`: open a dedicated **"Imported Hours Override"** dialog (replace the generic one for this path). Shows employee name, imported hours, new hours, delta, source ("Uploaded timesheet"). Requires a **reason category** (Select) plus optional free-text; Save disabled until category picked. Add a "Show this note on payroll PDF" toggle → when on, insert a row into `payroll_period_notes` (`show_on_pdf=true`, category='timesheet'), reusing the existing table and duplicate-guard by comparing normalised text against latest note for that period+employee.
   - The composite note is written to `payroll_entries.adjustment_note` and to the `payroll_adjustments` audit row (already recorded) via the existing save path.
   - Row-level display: keep the existing "Adjusted from X hrs" tooltip; the details drawer already renders reason/changed_by/changed_at.
   - Non-imported-hours changes (rate/service/bonus only) keep the current generic dialog.

3. **`src/lib/payroll-approval-checklist.ts`** — add `imported_hours_overrides` warning
   - Input gains `importedHoursOverrideCount?: number` and `importedHoursOverrideEmployeeIds?: string[]`.
   - When > 0: warning item, `requires_ack: true`, non-blocking, message "N employees have manually adjusted imported hours. Review before approval."
   - Wired from the existing adjustments query in the approval workflow container.

4. **PDF visibility** — no PDF changes needed: PDF already reads `payroll_period_notes` where `show_on_pdf=true`, and the "Manual Adjustments" table (added previously) already prints from `payroll_adjustments`.

5. **Approved-period protection** — no change; DB trigger blocks edits, UI already renders read-only for approved periods.

### Tests — `src/test/phase-imported-hours-override.test.ts`

- `formatOverrideNote` includes imported, new, category label, free text.
- Category required: `undefined` category returns error / disables save (pure guard function).
- `countImportedHoursOverrides` counts distinct employees with a `timesheet_hours` adjustment row whose linked entry has `imported_hours != null`.
- Checklist emits `imported_hours_overrides` warning with correct count, `requires_ack=true`, `blocking=false`.
- Checklist omits the item when count is 0.
- Duplicate-note guard: same normalised composite note not inserted twice into `payroll_period_notes`.
- NMW / SC / holiday / approval-write logic unchanged (snapshot equivalence of comparison + checklist blocking_count vs baseline with/without imported-hours overrides).

### Out of scope (unchanged)
Pay-rate logic, NMW formula, service-charge allocation, holiday calc, bonus logic, approval write path, importer matching logic. No schema migration — reuses `payroll_adjustments`, `payroll_entries.adjustment_note`, `payroll_period_notes`.
