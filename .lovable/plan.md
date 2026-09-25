# Integration plan: payroll and holiday corrections (PR #2)

Nothing is applied, installed, deployed or published by this plan. Onboarding PR #1 stays separate.

## What was checked

- I read PR #2 at commit `345f883`, including the audit document (43 files).
- Base commit `b0ca8b2`: all 29 files the PR edits are **byte-for-byte identical** in the current app. There is no newer work to merge around, and no conflicts are expected in the app code.
- 14 files are new. There are no name clashes. The existing payroll delete/undo files stay as they are.
- In the live database I read only the list of triggers (no records). The PR replaces three live steps that already exist and adds one new one. See the risks below.

## Step 1 — Bring in the app code as reviewed (no database change)

The exact PR contents, not a rewrite:

- **Complete reads:** new `src/lib/fetch-all-rows.ts`. Paged reads in `usePayroll`, `useHolidays`, `useHolidayLedger`, `usePayrollLocations`, `usePayrollImportStatus`, `usePayrollImportAliases` and `useEmploymentTermsComparison`.
- **Loading/error and Retry states:** `Payroll`, `Holidays`, `PayrollAnalytics`, `LocationDashboard`, `PayrollInlineAnalytics` and `EmployeePayrollExport`.
- **Approval/export safeguards:** `usePayrollApprovalGuardrails` and new `src/lib/payroll-data-readiness.ts`. Confirmations reset when figures change.
- **One holiday calculation:** new `holiday-year-summary.ts` and `holiday-carry-over.ts`, used by `useHolidayYearSummary`, `AddHolidayPaymentDialog` and `holiday-ledger-integrity.ts`. A recorded zero carry-over is respected. Differences from past figures are only flagged for review, never repaired.
- **Payments and settlements:** new `holiday-payment-transaction.ts`, plus `AddHolidayPaymentDialog`, `SettleLeaverDialog` and `useHolidays`. The browser does step-by-step writes today; these go through the single database step instead. **There is no fallback.**
- **No archiving on read:** `useEmployees` together with `EmployeeTable`, `AdminHome` and `AdminDesktopDashboard`.
- The CSV type fix in `payroll-timesheet-csv.ts`.
- The audit document, 5 new test files and 4 updated test files.

**Release blocker:** holiday payment, edit, delete and leaver settlement depend on the database step in Step 2. Until that step is installed they will show an error instead of saving. So the Step 1 code must **not be published** before Step 2 is approved and installed. Both go live together, as with payroll delete/undo.

### Other screens that could be affected by shared hooks
- `useEmployees`: every staff list (rota, contracts, training, alcohol lists, onboarding). The "working team" view now leaves leavers out; the view that includes everyone is unchanged.
- `usePayroll` / `useHolidays`: the dashboard widgets, Reports (Payroll Summary, Holiday Pay), Financial and the Settle Leaver candidates.
- `usePayrollLocations`: the location splits in PDFs and CSVs.

## Step 2 — Proposed database change (kept in the pending folder only)

The file `supabase/pending-migrations/20260925090000_atomic_holiday_payments.sql` is copied in unchanged. It is **not** placed where changes install automatically. It would:
- add a private receipts table so a retried request is not saved twice
- add one tenant-checked step, `mutate_holiday_payment_atomic` (create/update/delete/settle)
- **replace** the live `trg_protect_approved_payroll_entries` and `trg_protect_approved_holiday_payments` with one combined guard that locks the period
- **replace** the live `sync_payroll_period_totals` so totals include holiday pay, and add a new totals trigger on holiday payments
- **replace** the live `protect_approved_payroll_periods`
- remove direct browser writes to `holiday_payments`

## Step 3 — Checks (before any release)

1. Compare the PR's assumed versions of the three replaced live steps with the real ones. Report any logic that would be lost, for example the current accrual-ledger triggers.
2. Check that the installed payroll delete/undo still works with the new guards. Undo puts holiday payments back into a draft period. Do the new totals trigger and receipts table interfere?
3. Run the database tests **only on a private throwaway copy with made-up records**. A code branch alone does not give a separate database, so the live backend is never used. The cases covered:
   - duplicate or interrupted saves
   - approval at the same moment as a payment
   - manual and zero-balance leaver settlements
   - totals after payroll edits
   - locked-period refusal
   - cross-tenant refusal
   - delete/undo interaction
4. Run the full app test suite, the TypeScript check and the production build. Report exact counts and any failures without weakening tests. The PR reported 1 existing failure, which I will name.
5. Check that the screen, CSV and PDF totals agree, using test fixtures.

## Deliverable at the end

A report that keeps four groups apart:
- code prepared in the app
- what was tested and how
- what was deployed (nothing)
- the exact SQL awaiting your approval, with unresolved risks

## Not included
- No live data repairs, balance resets or entitlement changes.
- No publishing.
- No moving the SQL into the automatic folder.
- No changes to onboarding, contracts, training or compliance.
