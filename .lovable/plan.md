## Objective

Prove the payroll + holiday engine is structurally correct across **all** periods (past / current / future) and **all** employee states — not just June 2026. June 2026 remains the evidence case; the deliverable is a framework.

---

## Workstream A — Historical read-only validation (all periods)

Run deterministic SQL audits against every `payroll_periods` row (not just June 2026). For each period × employee, compute and compare:

1. **Base pay** = `timesheet_hours × hourly_rate` (+ service charge component + bonuses) vs stored `total_pay`
2. **Holiday accrual rows** in `holiday_ledger` exist for every approved entry with `holiday_accrued_hours > 0`
3. **Duplicate accrual detection** via `(source_table, source_id)` grouping
4. **Orphan accrual rows** — ledger rows whose `source_id` no longer exists in `payroll_entries`
5. **Holiday taken** in `holiday_requests` reconciled to `holiday_ledger` `taken` rows
6. **Holiday paid** in `holiday_payments` reconciled to `holiday_ledger` `payment` rows
7. **Manual adjustments** in `holiday_adjustments` reconciled to ledger `adjustment` / `correction` rows + `audit_log` presence
8. **NMW**: hourly_rate ≥ band rate by employee DOB / apprentice flag for the period's tax year
9. **Service charge** paid vs `service_charge_eligible` flag
10. **Approval state**: every `approved` period has accrual rows for every entry with hours > 0

Outputs:
- `/mnt/documents/payroll-historical-audit.csv` — one row per (period, employee)
- `/mnt/documents/payroll-historical-audit.md` — summary by period: pass/fail counts, defect categories
- `/mnt/documents/payroll-historical-defects.csv` — only failing rows with reason code

**Read-only — no data mutations in this workstream.** Any required backfill is reported, not executed, unless explicitly approved.

---

## Workstream B — Trigger / future-proofing verification

Confirm via `pg_trigger` + targeted test inserts in a scratch transaction (rolled back):

- `trg_payroll_entry_accrual_ledger` fires on INSERT/UPDATE of `payroll_entries` ✓
- `trg_payroll_period_approved_accrual_ledger` fires on period status → approved ✓
- Idempotency: re-approval does not duplicate (verified via `uq_holiday_ledger_source` unique constraint)
- Reopen + re-approve path safe (existing rows preserved, no new duplicates)
- Zero-hour entries do NOT create accrual rows (`ensure_accrual_ledger_for_entry` short-circuits on `holiday_accrued_hours <= 0`)
- Uses `timesheet_hours` (actual approved), not `scheduled_hours`
- Audit log entry written for trigger-created rows

---

## Workstream C — Regression test expansion

Extend `src/test/` suite with deterministic unit tests covering the 15 scenarios in the user's brief:

```
src/test/phase-payroll-engine-regression.test.ts   (NEW)
  - base pay formula
  - 12.07% accrual formula
  - service charge separation
  - starter pro-ration
  - leaver settlement basis A/B/C/D
  - carry-over application
  - zero-hour no-accrual
  - manual adjustment preservation
  - NMW band selection by DOB & date

src/test/phase-ledger-lifecycle-regression.test.ts  (NEW)
  - approval creates accrual
  - re-approval idempotent
  - reopen → re-approve safe
  - amended timesheet recalculates
  - holiday-taken deducts balance
  - holiday-paid deducts balance
```

Existing `phase-2026-accrual-gap-regression.test.ts` stays as the historical evidence case.

---

## Workstream D — Source-of-truth reconciliation matrix

A single document mapping each screen → source table → calculation basis → period scope:

| Screen | Source | Basis | Scope |
|---|---|---|---|
| Holiday / Leave tab | `holiday_balances` snapshot | Legacy snapshot | Current leave year |
| Holiday ledger | `holiday_ledger` sum | Transactional | All-time or filtered |
| Settle Leaver | `useHolidayYearSummary` | Basis A/B/C/D selectable | Employment-to-date |
| Investigate Ledger | `holiday_ledger` raw rows | Row-level | All-time |
| Payroll draft | `payroll_entries` | Period | Single period |
| Payroll export | finalised `payroll_entries` | Period | Single period |
| RTI/FPS | (not implemented — flagged) | — | — |

Output: `/mnt/documents/payroll-source-of-truth-matrix.md`

---

## Workstream E — Final sign-off report

Single consolidated report at `/mnt/documents/payroll-system-verification.md`:
- Historical pass/fail per period
- Defect register (with employee + period + reason code)
- Trigger verification evidence
- Regression test results (counts)
- Source-of-truth matrix link
- Known limitations (RTI/FPS not implemented, gross-to-net not implemented, stale `holiday_balances` snapshot pattern)
- Backfill recommendations (NOT auto-executed for historical periods)

---

## Technical notes

- All historical queries are `SELECT`-only via `psql`
- No migrations in this workstream unless a structural defect is found
- Service-charge eligibility defect (6 employees) and Marco Ribeiro £100 anomaly from the previous June 2026 audit are carried into the historical defect register
- No changes to the holiday formula, ledger schema, or Settle Leaver UI — those are signed off
- Estimated runtime: ~15-25 tool calls (SQL audits, file writes, test creation, test execution)

---

## Out of scope (explicitly)

- RTI/FPS export implementation (does not exist in codebase — flagged as gap, not built here)
- Gross-to-net tax/NI calculation engine (does not exist — flagged as gap)
- Automatic backfill of historical defects (requires explicit approval per period)
- Changes to UI/visual design

---

## Approval needed

Confirm before I start:
1. **Read-only across history is fine** (no data writes outside the test DB transactions)
2. **Defects found in historical periods are REPORTED, not auto-fixed** — you decide period-by-period
3. **No new migrations** unless I find a structural defect (e.g. missing index, missing unique constraint, broken trigger)
