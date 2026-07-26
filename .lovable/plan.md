
# Payroll Month-on-Month Smart Change Review

Adds a read-only comparison layer between the current payroll period and the immediately previous payroll period, with smart highlighting, an employee change pop-up, per-note PDF visibility toggle, and an approval-checklist summary. No calculation, NMW, service-charge, holiday, or approval-write logic is changed.

## 1. New comparison engine (pure, tested)

New file: `src/lib/payroll-change-review.ts`

Pure functions — no DB, no React:

- `buildPeriodComparison({ currentPeriod, currentEntries, previousPeriod, previousEntries, currentAdjustments, previousAdjustments })`
- Returns per-employee `EmployeeChange`:
  - `hourly_rate`: `{ prev, curr, changed, severity }` — always highlight if changed.
  - `service_charge`: same shape — always highlight if changed.
  - `bonus`, `holiday_pay`, `manual_adjustment_count`: change flags.
  - `hours`: `{ prev_total, curr_total, prev_weeks, curr_weeks, prev_weekly_avg, curr_weekly_avg, pct_weekly_change, severity }`.
  - `gross_pay`: same shape with pct.
  - Flags: `missing_from_timesheet`, `zero_hours_but_had_hours`, `is_new_starter`, `is_leaver`.
- Severity rules (thresholds constant, easy to tune):
  - rate/SC change → `amber` if any change, `red` if change and employee is a leaver or has £0 hours.
  - `zero_hours_but_had_hours` when `prev_total > 0` and `curr_total == 0` and not a new starter/leaver → `red`.
  - Weekly-average hours change > 25% (using period weeks) → `amber`.
  - Gross pay change > 25% → `amber`.
  - Pure period-length effects (weekly avg stable) → no flag.
- `summarizeComparison(...)`: totals used by approval checklist.

Weeks per period derived from `payroll_periods.period_start/period_end` (already available), rounded to nearest week (min 1).

## 2. Data plumbing

- New hook `src/hooks/usePayrollComparison.ts` — fetches previous period (by `period_end < current.period_start`, most recent, `status != 'deprecated'`), its entries and adjustments, and returns `buildPeriodComparison(...)` output. Read-only.
- Reuses `usePayrollEntries`, `usePayrollAdjustments`, `usePayrollPeriods`.

## 3. UI — payroll table highlighting

Edit `src/components/payroll/EditablePayrollTable.tsx` (and its row component if separate):

- Consume `usePayrollComparison(currentPeriodId)`.
- On each row, apply cell background/border classes using semantic tokens (`bg-destructive/10`, `bg-warning/10`, ring on change) for:
  - Hourly rate cell
  - Service charge cell
  - Timesheet hours cell (zero-with-prior / large weekly avg change / missing import)
- Small inline text: "was £11.00", "was 80h / 20h wk".
- No mutation, purely visual + a small "Review" affordance to open the pop-up.

## 4. Employee change pop-up

New file: `src/components/payroll/EmployeeChangeReviewDialog.tsx`

Triggered by clicking any highlighted cell or a "Review changes" button on the row. Shows:

- Employee name, current period, previous period.
- Table of fields (rate / SC / bonus / hours total / hours weekly avg / holiday pay / gross pay) with `prev`, `curr`, `diff`, `source` badge (timesheet import / manual edit / copied / holiday payment / bonus / SC change), and warning text.
- Existing notes for this employee in the period (`payroll_period_notes` filtered by `employee_id`).
- "Add note" form:
  - Text
  - Category (rate change / service charge / timesheet / manual adjustment / holiday / bonus / other)
  - "Show on payroll PDF" toggle — default OFF (internal only)
- Uses existing `useCreatePayrollPeriodNote` mutation.

Source detection is best-effort/read-only from what we already have: `payroll_adjustments` rows keyed by field, `holiday_payments`, `payroll_import_aliases`/`payroll_imports` for timesheet import — no schema changes required beyond note visibility (below).

## 5. Per-note PDF visibility

Small schema change on existing `payroll_period_notes`:

- Add columns:
  - `show_on_pdf boolean not null default false`
  - `category text` (nullable; free-form label from the pop-up)
- Migration includes GRANTs preserved; RLS unchanged.

Wiring:

- `usePayrollPeriodNotes` returns new fields.
- `useCreatePayrollPeriodNote` accepts `show_on_pdf` and `category`.
- `PayrollPeriodNotes.tsx` add-note dialog: category select + "Show on payroll PDF" checkbox; list rows show a small "PDF" badge when enabled.
- `PayrollReportBuilder.tsx`: when the existing "Include Period Notes" toggle is ON, keep current behaviour (all notes). When OFF, pass only notes where `show_on_pdf = true` (so a manager can still surface specific notes without turning the whole section on). This preserves current UX and audit trail.
- `PayrollPDF.tsx`: unchanged rendering; input array is filtered upstream.

Manual-notes preservation is inherent — we only insert, never bulk-write.

## 6. "Add visible notes for detected changes" toggle

A single toggle in the review panel (client-side only, no auto-writes) that reveals a "Create note" shortcut per detected change (rate/SC/hours). Clicking uses the same `useCreatePayrollPeriodNote` path. No batch auto-write on import — safe by default.

## 7. Approval checklist summary

Edit `src/lib/payroll-approval-checklist.ts` and its input shape:

- Add optional `comparison: PayrollComparisonSummary` to `ApprovalChecklistInput`.
- Add non-blocking `warning` items:
  - "N pay rates changed vs previous period"
  - "N service charge values changed"
  - "N employees have 0.00 hours but had hours last period" (this one `warning` with required ack)
  - "N employees missing from imported timesheet" (warning + ack)
  - "N notes marked to appear on payroll PDF" (informational pass)
- No new blockers — approval write path unchanged.
- `usePayrollApprovalGuardrails` extended to include comparison summary; `Payroll.tsx` passes it through.

## 8. Tests

New file: `src/test/phase-payroll-change-review.test.ts` (vitest, pure logic):

- rate change always detected
- SC change always detected
- 4-week vs 5-week with stable weekly average → no warning
- 4-week → 5-week with >25% weekly avg change → warning
- prev hours > 0 and curr hours = 0 → high attention (unless leaver/new starter)
- new starter not flagged as "missing last period"
- leaver handled: no false weekly-avg warning
- missing from timesheet flagged
- gross pay > 25% change flagged
- summary counts correct

Second file: `src/test/phase-payroll-change-review-notes.test.ts`:

- note default is internal only
- `show_on_pdf=true` note surfaces when Report Builder "Include Period Notes" is off
- disabling visible-notes toggle does not delete existing notes
- duplicate note guard (same employee + same auto-generated text within period is not re-inserted by the review panel)
- existing manual notes preserved after review actions

All existing tests (668) continue to pass — no changes to calc/NMW/SC/holiday logic.

## 9. Safety re-confirmation

- No writes to `payroll_entries` totals, `holiday_ledger`, `holiday_payments`, `employees` rates.
- Approved periods: comparison is still displayed but "Add note" is disabled when `status = approved` (matches existing period lock).
- Audit rows (`audit_log`, adjustments) untouched.
- Import path unchanged — no auto note-writing during import; only manager-initiated notes.

## Technical notes

- Files added:
  - `src/lib/payroll-change-review.ts`
  - `src/hooks/usePayrollComparison.ts`
  - `src/components/payroll/EmployeeChangeReviewDialog.tsx`
  - `src/test/phase-payroll-change-review.test.ts`
  - `src/test/phase-payroll-change-review-notes.test.ts`
- Files edited:
  - `src/components/payroll/EditablePayrollTable.tsx` (highlighting + trigger)
  - `src/components/payroll/PayrollPeriodNotes.tsx` (category + show_on_pdf)
  - `src/hooks/usePayrollPeriodNotes.ts` (new fields)
  - `src/components/payroll/PayrollReportBuilder.tsx` (per-note filter)
  - `src/lib/payroll-approval-checklist.ts` (+comparison summary items)
  - `src/hooks/usePayrollApprovalGuardrails.ts` and `src/pages/Payroll.tsx` (wire summary)
- Migration:
  - `payroll_period_notes` → add `show_on_pdf boolean default false not null`, `category text`.
- No changes to edge functions, RLS, or approval write path.
