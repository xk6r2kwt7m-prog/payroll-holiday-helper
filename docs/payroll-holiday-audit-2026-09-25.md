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

## Second implementation round

The earlier transactional-write, total-trigger, insert-lock, divergent-balance and read-side-archiving findings now have proposed code fixes in this branch. They are **not deployed fixes**. The database portion is deliberately outside `supabase/migrations`, in `supabase/pending-migrations/20260925090000_atomic_holiday_payments.sql`, and requires exact-SQL approval before execution.

| Finding | Implemented correction |
|---|---|
| Payment, ledger, totals and audit could save only partly | Create/update/delete use one tenant-checked database RPC. An exception rolls back the transaction. No browser write fallback. |
| Lost responses could create duplicate payments | Server stores request receipts; the mounted editor retains request IDs after errors and coalesces identical simultaneous calls. |
| Editing payroll could erase holiday pay from period totals | Proposed trigger recalculates worked pay plus holiday pay and refreshes both parents when a privileged maintenance operation moves an entry. |
| Approved periods could receive new child rows | Proposed insert/update/delete guards lock the parent and reject changes to locked periods, including privileged direct writes. Reopening cannot also alter locked totals. |
| Leaver settlement used separate adjustment, payment and status writes | One settlement transaction validates the reviewed balance and saves its adjustment, payment/debit, employee status and audits together. Manual adjustments use the difference from the existing balance; zero balances create no payment. |
| Ordinary payment edits could partially undo a settlement | These edits/deletes are refused for settlement payments. A dedicated reviewed settlement reversal is still required. |
| Dashboard and payment form used different balances | Both consume `summariseHolidayYear`, using recorded ledger movements and separately identified unposted accrual. Posted open-period accrual is not counted twice. Missing posted evidence raises a review flag. |
| Historical figures could be carried forward silently | The dashboard shows discrepancies against its previous calculation for review. No opening balances, historical records or entitlements are automatically deleted, converted or repaired. |
| Opening the employee list archived leavers | Reads now only read, with paginated results. The working-team view excludes leavers; the existing inclusive view retains them. |
| Settlement evidence could be incomplete | Required sources are paginated, tenant-scoped and checked for loading/errors. Refreshing evidence clears previous confirmations. Historical/full-employment comparisons cannot directly authorise a payout. |

The proposal adds one private receipt table, a public transaction RPC, parent/total triggers and restrictive ledger policies. It replaces existing trigger functions and revokes direct client payment writes. Installation contains no backfill or update of existing payroll/employee records. Calling the RPC after installation does perform the explicitly requested operation.

The generated-type file contains a hand-added declaration for the proposed RPC. Regenerate it from the reviewed staging schema after installation; it has not been regenerated from production.

## Validation

- Baseline: **1,727 passed, 1 failed**. First round: **1,752 passed, 1 failed**.
- Second-round full application suite: **1,765 passed, 1 failed** across 121 files. The remaining failure is the same source-text assertion in `phase-personal-data-protection.test.ts`: it expects one-line unbraced token/anon-key rejection, while the actual guard includes logging in braced branches. The guard and that test were not changed. This does not independently validate the guard's security.
- **32 database checks passed** against a disposable, synthetic PGlite PostgreSQL fixture, loading two relevant existing migrations and the proposed SQL. These exercise permissions, tenant isolation, retries, amount validation, year changes, total recalculation, locked periods, ledger/audit/payment/employee failure rollback, manual adjustment deltas, zero settlements, stale balances and partial-reversal refusal.
- New behavioural unit cases exercise the RPC runner and common balance arithmetic. Updated source-wiring assertions complement them; they are not substitutes for database integration tests.
- TypeScript application check passed. Production build passed; the existing large-bundle warning remains. Diff/whitespace checks passed.

The database fixture is explicitly **not a clone of the deployed database**. It does not establish compatibility with all production triggers, recovery functions or permissions, or prove safety under multiple PostgreSQL sessions.

Run the isolated database checks with a locally installed `@electric-sql/pglite@0.5.8` package (the tested version):

```sh
PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node supabase/pending-migrations/tests/holiday-payment-transactions.mjs
```

The test has no production URL and uses only synthetic data in memory.

## Remaining release gates and limitations

1. **Deployed-schema compatibility:** inspect the actual schema/grants/triggers and test this SQL with the draft-period deletion/restoration functions. Recovery reinsertion and ledger restoration can activate triggers; they must be exercised together before release. Preserve the existing source uniqueness constraint.
2. **True concurrency:** run independent PostgreSQL sessions for approve versus payment writes, two settlements for one employee, entry moves, period recovery and simultaneous edits. PGlite tests here are single-session. A deadlock must roll back cleanly and return a useful retry message. No race-proof claim is made.
3. **Other writers:** historical imports, merge/repair functions and service-role maintenance still have separate write paths. The new parent locks protect their period status and totals, but this PR does not make every such workflow atomic. Existing browser ledger repair tools may now be blocked by the restrictive policies. Audit or port these workflows before enabling them with the migration.
4. **Settlement reversal:** ordinary edit/delete is intentionally blocked when it would leave a settlement's adjustment or lifecycle change behind. Implement and test a complete reversal workflow before promising self-service reversal in the UI. The period recovery interaction needs the compatibility check above.
5. **Historical entitlement:** reconcile opening balances and previous-system records using original evidence. Missing ledger evidence and legacy-calculation differences are review items, not permission to erase accrued rights. No live employee balance has been verified in this code audit.
6. **Retry lifetime:** the server receipt persists, but the editor's request ID currently survives errors only while mounted. Refreshing/reopening after an uncertain ordinary payment response can start a new request; operators must check recorded payments first. A durable client pending-operation journal is a follow-up.
7. **Business-rule coverage:** the retained calendar-year and start-date accrual allocation assumptions need confirmation against configured leave-year policy. Snapshot comparisons do not resolve all legacy corrected-period or source discrepancies; mismatches refuse settlement.
8. **Efficiency and usability:** the build still has a roughly 7.1 MB minified main chunk. Server aggregates, route/PDF lazy loading, phone performance measurements and authenticated end-to-end usability checks remain. Pagination prevents truncation, but it is not a database snapshot during concurrent changes. Bulk entry updates remain separate requests.

## Review and rollout

Keep this PR in draft until the database and integration gates are satisfied. Do not merge the RPC client changes alone: without the new function holiday writes deliberately fail with a clear error. Review the exact pending SQL first, then install in staging, regenerate types and test the matching client. Verify old-client behaviour after direct payment grants are revoked, and prepare a rollback that preserves operation receipts rather than deleting audit evidence.

After staging checks, reconcile a representative draft period and holiday year against timesheets/payment evidence, covering a starter, leaver, opening balance, zero balance, holiday-only payment and more than 1,000 source rows. Check persisted totals, UI, CSV and PDF together. Publish the database and compatible client in a coordinated release only after approval.

No live database migration, staff/payroll record change, approval, email or deployment was performed for this implementation round.
