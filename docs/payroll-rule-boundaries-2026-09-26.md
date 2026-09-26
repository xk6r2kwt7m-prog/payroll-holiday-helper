# Payroll and holiday rule boundaries

This follow-up is stacked on `fix/app-change-safeguards` (PR #3). It changes financial evidence validation and refresh behaviour only; it does not install SQL or change live balances.

## Confirmed inconsistencies and corrections

1. **Matching source IDs did not prove matching figures.** The year summary only checked whether a payment debit/accrual existed. An existing debit with wrong hours/money or an old accrual could pass. A separate pure module now detects missing/duplicate payment debits, differing hours/money, missing debit amounts, duplicate accruals and accrual hours that disagree with payroll. It raises the existing review flag and preserves recorded balances. Payment and settlement screens already block on that flag. The payment query now fetches hours as well as totals.
2. **Unknown payroll statuses became pending entitlement.** Unrecognised unposted states now trigger review and contribute no provisional hours. Known draft/pending/rejected behaviour remains unchanged.
3. **Status changes left dependent evidence cached.** Submit/approve/reopen hooks refreshed only period rows. They now refresh entry and holiday queries after success or failure/uncertain response, so stale cached figures are re-read.

## Separate responsibilities

| Area | Owner | Must not do |
|---|---|---|
| Source agreement | `src/lib/financial-rules/holiday-source-checks.ts` | Repair history, call APIs, change balances or decide legal entitlement |
| Year arithmetic | `src/lib/holiday-year-summary.ts` | Save records, implement screen state or silently create opening balances |
| Payroll status vocabulary | `src/lib/payroll-status.ts` | Implement approval writes or presentation |
| Data reads and cache refresh | Hooks | Invent financial rules to compensate for missing evidence |
| Payment/settlement persistence | Reviewed server transaction proposal | Fall back to partial browser writes |
| Presentation | Dashboard and dialogs | Introduce independent competing calculations |

`npm run check:financial-boundaries` checks the listed pure modules for direct UI/database imports, browser storage/network globals and dynamic imports. It is added to the PR check workflow. Scoped AGENTS.md instructions document responsibilities. Four intentional prohibited-code probes were rejected by the check.

This is an initial, enforceable dependency boundary, not a complete app decomposition. It does not prove transitive dependency purity, prevent someone editing unrelated files, or stop someone changing the checks. Required GitHub review/check rules and inspection of the changed-file list remain necessary. A broad rewrite was deliberately avoided.

## Critical issues still requiring database work

- **Approve/edit/reapprove accrual:** the latest committed `ensure_accrual_ledger_for_entry` definition in `20260824163108_d61f5668-0fa4-455d-b6ef-5e3a7efc0667.sql` inserts using `ON CONFLICT ... DO NOTHING`. An existing source can therefore retain an earlier amount. The new client check detects differing hours; it does not implement ledger reversal/reposting. Inspect deployed triggers and test a complete reopen/edit/reapprove sequence before changing accounting policy.
- **Approval and audit are separate requests:** submit/approve/reopen hooks write status and then audit separately, without handling the audit insert result. Move transition validation, row locking, required evidence and audit to one server transaction. Client refresh is not a fix for transaction atomicity.
- **Client/server settlement parity:** the proposed settlement SQL and client summary do not share the corrected-period filtering implementation. Verify superseded periods and year allocation using identical fixtures. Do not bypass a disagreement by accepting the client amount.
- **Retry across refresh:** mounted-editor retry IDs are not a durable client journal. Refreshing after an uncertain payment result can start a new request. Server receipt handling alone does not prevent every new-ID duplicate.
- **Recovery and maintenance paths:** deletion/restoration, settlement reversal, historical imports and service-role repairs need integration/concurrency testing with all deployed triggers. No existing SQL was changed here.
- **Opening balances:** previous-system entitlement needs evidence-backed reconciliation, not an automatic reset at the first timesheet import.

## Validation and limits

Full local suite: **1,795 passed, 0 failed across 126 files**, including 16 additional cases in this follow-up. TypeScript, production build and financial-boundary checks passed; existing bundle warnings remain. Tests use synthetic evidence. Source mismatch tests preserve ledger totals while requiring review; they do not fabricate a replacement balance.

Payment-source amount checks may flag legacy debits with missing money values. Resolve those from evidence. Do not automatically fill values merely to clear the warning. A correction legitimately changing a source can also require review; this conservative behaviour is intentional.

Current warning text says records are missing or inconsistent. Detailed per-source issue presentation and a controlled reconciliation workflow are still follow-ups. These checks are client-facing safeguards; server-enforced financial integrity remains mandatory.

No authenticated production sessions, live records, legal entitlement audit or deployed-schema verification were performed. No migration, release, approval or email was executed.
