# Payroll and holiday reliability review — 25 September 2026

## Outcome and scope

**Targeted fixes are ready for review. The system is not certified error-free.**

Reviewed the repository's payroll page, approval checks, holiday dashboard, balance and payment hooks, leaver settlement, report inputs, and relevant committed database migrations. No live payroll or employee records were read or changed, no payroll was approved, and no email was sent. No migration or deployment was performed. Production database drift, real employee balances and mobile usability with authenticated accounts have not been verified.

Base: `b0ca8b2e4ff97146d67e4fb323a6882a844607c9`. Branch: `fix/payroll-holiday-reliability`. This is separate from the staff onboarding change in PR #1.

## Implemented fixes

| Issue | Change | Practical result |
|---|---|---|
| Financial reads could silently stop at the API row limit | Paginate payroll entries/periods, holiday payments/balances/adjustments/ledger, location allocations and period-total input reads; order by a unique ID | Larger histories are read completely; a failed later page rejects the whole read |
| Holiday dashboard opened 2025 and requested five separate years per source | Default to the current year, derive available years from records, group each source once | Fewer redundant year queries; new years do not require a code change |
| Recorded zero carry-over was overwritten by prior-year balance | Treat an existing balance row as authoritative even at zero | No accidental resurrection of explicitly excluded carry-over |
| Payment form could display a different year's balance from the holiday date | Derive its balance year directly from the date; remove the independent year selector | Balance checked and payment recorded refer to the same year |
| Missing or failed safety data could look like an empty successful result | Expose loading/errors, show Retry messages and block payroll approval/submission/export and holiday payment/settlement until required data is available | Unknown data cannot silently pass the updated screens |
| Approval handler relied on its UI to enforce the final checklist | Check readiness inside the handler too; data failures also block the override path | Button wiring alone cannot bypass an unavailable check |
| Previous confirmations survived edits | Reset payroll confirmations when evidence changes and payment confirmations when employee/date/amount/balance changes | An acknowledgement covers the figures actually reviewed |
| Missing historical period IDs fetched all company entries | Disable those period-specific reads while preserving intentional all-period report queries | Missing months cannot masquerade as company-wide payroll in comparisons |
| Bulk updates could fail early while other writes were still running | Wait for all results, report partial failure and refresh even on failure | The screen reconciles to what actually saved; this does not make the operation atomic |
| A holiday audit calculation converted null hours to zero before fallback | Apply the null fallback before numeric conversion | Legacy entries can use their recorded timesheet hours |
| Existing CSV type-check failure | Explicitly type header strings | TypeScript compilation succeeds without changing the export calculation |

The holiday dashboard now gates its main totals on all six financial source queries. The balance hook also withholds stale results during refresh. Pending accrual remains explicitly separate from committed ledger accrual.

## Unresolved release risks

### High: holiday payment writes are not transactional

Evidence: `src/hooks/useHolidays.ts`, `useCreateHolidayPayment`, `useUpdateHolidayPayment`, `useDeleteHolidayPayment`; manual leaver adjustments in `src/components/holidays/SettleLeaverDialog.tsx`.

Creation, payment changes, ledger changes and period-total updates are separate requests. Creation currently discards ledger-insert errors; deletion removes the ledger debit before removing the payment. An interrupted request or permission failure can leave balances and payments inconsistent. A retry can duplicate a payment. The UI safeguards in this change do not resolve this.

Required next implementation: one server-side transaction per operation, tenant/permission/status checks inside that transaction, idempotency keys, a locked parent period, ledger-source uniqueness, consistent totals, and audit records committed together. Test failures at each write, duplicate requests and simultaneous approve/edit/delete. Check compatibility with the existing atomic period recovery functions before applying SQL. Do not try to compensate by issuing more browser writes.

### High: the committed total-sync trigger omits holiday payments

Evidence: `supabase/migrations/20260321214616_1fb784e9-21a3-45c1-aa53-f9d8614df566.sql`, `sync_payroll_period_totals`.

That definition assigns `grand_total` from payroll entry `total_pay` only. The client holiday helper adds holiday payments, so a later entry update can overwrite the combined total. No later replacement was found in the committed migrations searched. The deployed function definition still needs verification.

Required acceptance test: add a holiday payment, edit payroll hours, and compare the persisted period total, displayed total, CSV and PDF against the same independent sum. Repeat after moving/deleting a payment and with concurrent edits. Fix both old and new parent periods when records can move.

### High: approved-period holiday insertion needs a database guard

The same committed migration attaches `protect_approved_holiday_payments` to UPDATE/DELETE, not INSERT. A client-side draft selector is insufficient protection against direct API calls and approval races. Inspect all deployed triggers and RLS, then enforce permitted status under a parent-period lock for insert, update and delete.

### High: holiday balance calculations still have multiple sources

The dashboard builds accrual from payroll entries and uses legacy balance/adjustment data, while `useHolidayYearSummary` derives committed values from the ledger. The legacy dashboard fallback still carries positive prior-year balance when there is no recorded balance row. This patch preserves existing policy rather than inventing eligibility or changing historical entitlement.

Next: reconcile the sources per employee/year in a read-only report. Resolve differences explicitly, then make dashboard, payment form, leaver settlement and exports consume the same documented balance service. Include expiry, corrections, carry-over, imported history and superseded periods in fixtures. No automatic balance repair is included.

### Unexpected writes during employee reads

`src/hooks/useEmployees.ts` currently updates unarchived leavers before fetching employees. Opening a screen can therefore change employee records and repeat that request across consumers. This review did not execute those queries against production. Move archiving to an explicit authorised lifecycle operation and preserve clear active/archive views; do not silently rewrite historical staff status during reads.

### Efficiency and user-experience follow-up

- The production build still emits a main JavaScript chunk of roughly 7.1 MB minified (about 1.95 MB gzip). Lazy-load report/PDF and other heavy route features, then measure initial interaction on a representative phone.
- Paginated history reads provide correctness, but still load all history. For growing datasets, use indexed server-side employee/year aggregates and only fetch detailed rows when expanded. Offset pagination does not itself provide a transactionally consistent snapshot under concurrent writes.
- Consolidate duplicate review panels into one clear task list: resolve blockers, review changes, confirm, approve. Do not remove leavers with legitimate pay from a selected period.
- Bulk updates remain multiple writes even though their error handling is improved.
- Other reports/hooks can still have their own row limits. The new helper covers the listed reads, not every query in the application.

## Validation

Baseline full suite: **1,727 passed, 1 failed**. The existing failure is the source-text assertion in `phase-personal-data-protection.test.ts` expecting an unbraced one-line token rejection; the guard currently includes logging in a braced branch. It also expects an unbraced anon-key rejection. This patch does not alter that guard or weaken that test.

After fixes: **1,752 passed, 1 failed** (119 test files). The same baseline failure remains. The 25 added behavioural cases cover multi-page reads, failure instead of partial totals, page boundaries, zero/positive/negative carry-over, approval-data readiness, balance withholding/retry across each source, and isolation from cached all-company payroll when a period is absent. Two existing source-wiring tests were updated for dynamic year grouping and evidence-based confirmation resets.

TypeScript application check: passed. Production build: passed, with the bundle-size warning above. Whitespace/diff check: passed.

Not performed: live record reconciliation, production schema verification, authenticated end-to-end mobile sessions, transaction/concurrency tests against an actual database, performance benchmarks, or an exhaustive security/legal audit. Passing unit tests does not prove payroll correctness.

## Review and rollout

1. Review the branch diff and confirm the revised screen messages and year behaviour in a test environment.
2. Re-run the checks above on the integration branch, especially if PR #1 or Lovable has changed the same files.
3. Verify deployed SQL and implement the transactional payment/total/status safeguards as a separately reviewed migration with rollback and recovery tests. No such migration is included or authorised for execution by this report.
4. Reconcile a representative draft period and holiday year against original timesheets and payment evidence, including a starter, leaver, carry-over case and holiday-only payment.
5. Exercise slow/failing network, more than 1,000 records, double-clicks, retry, and two concurrent administrators before release sign-off.
