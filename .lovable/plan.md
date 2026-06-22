## Investigation findings (Kazumi Ortega, 812f8912)

I ran the numbers directly against the database. The three screens are showing **three different calculations of the same balance**, and each is reading a different source:

### 2026 ledger (holiday_ledger) — what Settle Leaver and Investigate Ledger use
| Date | Type | Hours | Source |
|---|---|---|---|
| 2026-01-01 | carry_over_in | +182.05 | holiday_balances |
| 2026-01-15 | holiday_taken | **-187.00** | holiday_balances (NOT holiday_payments) — note: *"Backfill reconciliation: hours_taken from balance snapshot (no holiday_payments source)"* |
| 2026-01-26 | accrual | +3.45 | payroll_entries (Feb 2026 period) |

→ accrued 3.45, carry 182.05, taken 187, balance **-1.50h** (matches Settle Leaver exactly).

### 2026 payroll_entries — what the Holiday / Leave tab actually sums
| Period | Status | holiday_accrued_hours |
|---|---|---|
| 26 Jan–22 Feb | approved | 3.45 |
| 23 Feb–22 Mar | approved | 0.00 |
| 23 Mar–19 Apr | approved | 6.00 |
| 20 Apr–24 May | pending  | 20.04 |
| 25 May–21 Jun | draft    | 4.67 |

Sum = **34.16h accrued** (matches Holiday tab).
holiday_payments for 2026 leave year = **0 rows** → taken shown as 0.00.
holiday_balances.hours_carried_over (2026) = 182.05.
→ accrued 34.16 + carry 182.05 − taken 0 = **216.21h** (matches Holiday tab "216.1").

### 2026 holiday_balances snapshot
Stored as: accrued 3.45, taken 187, carry 182.05 → -1.50h (aligned with ledger).

## Which screen is correct?

**Neither is fully correct, but they answer different questions.**

- **Settle Leaver / Investigate Ledger** (-1.50h) is using the **ledger as single source of truth** (matches our governance rule), but the ledger is **incomplete**:
  - Only 1 of 5 2026 payroll_entries was written to the ledger as `accrual` (3.45h). The other 4 periods (0, 6.00, 20.04, 4.67 = +30.71h) were **never backfilled into the ledger**.
  - It contains a **-187h orphan `holiday_taken` row** sourced from `holiday_balances` directly, with no matching `holiday_payments` record. This is the same pattern as the Viktoriia bug — a snapshot was reconciled into the ledger but the underlying payment record does not exist.
- **Holiday / Leave tab** (216.1h) is using **payroll_entries + holiday_payments + holiday_balances** directly and never touches the ledger. It correctly sees the 4 missing accrual periods, but it also misses the 187h that someone clearly recorded as taken (otherwise it would not be on the snapshot).

So:
- The Holiday tab is **right about accrual** (34.16h is what the approved/pending payroll periods actually generated).
- The ledger / Settle Leaver is **right that 187h were marked taken somewhere** (the snapshot row exists), but **wrong to count it without a payment trail**.

The true balance, if those 187h are real holiday taken, is `34.16 + 182.05 − 187 = 29.21h`. If the 187h is the same kind of orphan as Viktoriia's, the true balance is `34.16 + 182.05 = 216.21h`. Manager decision required.

## Source-of-truth mismatch across the app

| Screen | Accrued source | Taken source | Carry source |
|---|---|---|---|
| Holiday / Leave tab (`pages/Holidays.tsx`) | `payroll_entries.holiday_accrued_hours` | `holiday_payments.hours` | `holiday_balances.hours_carried_over` |
| Settle Leaver (`SettleLeaverDialog`) | `holiday_ledger` (via `useHolidayYearSummary`) | `holiday_ledger` | `holiday_ledger` |
| Investigate Ledger | `holiday_ledger` | `holiday_ledger` | `holiday_ledger` |
| Payroll period rows | `payroll_entries.holiday_accrued_hours` | n/a | n/a |

This violates the **Unified Balance Logic** memory: `useHolidayYearSummary` should be the only source. The Holiday tab is the outlier.

## Scope: who else is affected?

Anyone who (a) has payroll_entries with `holiday_accrued_hours > 0` that were created after the last ledger backfill, **or** (b) has a `holiday_balances.hours_taken` value with no matching `holiday_payments` rows, will show the same inconsistency. I will run a query as part of the fix to list every affected employee.

## Plan

### A. Make the ledger the single source of truth everywhere (no silent change to calculations)
1. Refactor `pages/Holidays.tsx` summary builder to read from `useHolidayYearSummary` (per-employee) instead of summing `payroll_entries` / `holiday_payments` / `holiday_balances` directly. Carry-over fallback for years where the ledger has no `carry_over_in` row remains supported.
2. Keep the comparison view on `Holidays.tsx` showing both the ledger value and the legacy computed value, so the manager can spot divergence and trigger a backfill — never silently overwrites historical data.

### B. Diagnostic + safe backfill tools (admin only, all reversible)
1. Add an **"Accrual gap"** detector: for each (employee, leave_year), compare `sum(payroll_entries.holiday_accrued_hours where period.status in approved/pending/draft)` to `sum(holiday_ledger.accrual where source_table='payroll_entries')`. Surface gap in `InvestigateLedgerDialog` warnings panel.
2. Add admin button "Backfill missing accrual entries" that inserts ledger rows of type `accrual` (one per missing `payroll_entries` row), source-linked to the payroll entry, blocked when the period is approved+locked unless the entry itself has no ledger row yet (creation is additive, never modifies existing rows).
3. Reuse the existing **orphan ledger reversal** flow for `-187h` style rows (already shipped).

### C. New "Holiday Entitlement Basis" section on Settle Leaver
Add a card above the balance summary with 4 mutually-exclusive options (radio group). For each option, calculate from the same `holiday_ledger` + `payroll_entries` + `holiday_payments` sources, but with different filters:

- **A. Current payroll period only** — sum `payroll_entries.holiday_accrued_hours` for selected period; taken = holiday_payments in that period; balance = accrual − taken.
- **B. Current holiday year only** — same as today's calculation scoped to leave year, no carry.
- **C. Full employment period including previous years** (DEFAULT FOR LEAVERS) — uses all ledger entries from `employees.start_date` forward, including `carry_over_in` rows and `manual_adjustment`/`correction` rows.
- **D. Manual verified adjustment** — admin-only, exposes hours+reason+supporting note inputs; on submit writes a `manual_adjustment` ledger row with `notes` (audit) before recording the settlement payment. Permission gate: `approve_holidays`.

The auto-filled hours field is driven by whichever option is selected. Switching options recomputes; the form does not persist values across switches without confirmation.

### D. Source comparison table on Settle Leaver
Below the basis selector, render a comparison table:

| Source | Accrued | Carry | Taken | Paid | Balance |
|---|---|---|---|---|---|
| Holiday / Leave tab (legacy computed) | … | … | … | … | … |
| Holiday ledger (single source of truth) | … | … | … | … | … |
| Holiday balances snapshot | … | … | … | … | … |
| Manual recalculation (this dialog) | … | … | … | … | … |

If any two rows diverge by more than 0.01h, show:
> ⚠ **Holiday balance mismatch detected. Please review before settling this employee.**
…with a "Open Investigate Ledger" deep link. The Settle button is **disabled** when a mismatch exists unless the admin ticks an extra "I have reviewed the mismatch and choose to proceed" confirmation (with audit log capturing the choice).

### E. Header fields on Settle Leaver
Show: employee start date, selected entitlement basis, current holiday year, actual approved hours worked (sum from `payroll_entries`), accrued, carry-over, taken, already-paid, manual adjustments, final balance (h), final balance (£).

### F. Tests
1. `phase-holiday-source-of-truth.test.ts` — verifies Holidays page summary uses ledger, falls back to carry-over snapshot only when ledger has no `carry_over_in` row.
2. `phase-settle-leaver-entitlement-basis.test.ts` — verifies A/B/C/D calculation correctness, leaver default = C, mismatch detection, disabled-submit-on-mismatch behaviour, audit logging of overrides.
3. `phase-holiday-accrual-gap.test.ts` — verifies detector lists missing `payroll_entries → ledger` rows and that the backfill only inserts (never updates) ledger rows.

### G. Invariants preserved
- No changes to NMW, service charge, rate calc, payroll period status transitions, employee profile fields, or the existing approved/locked write protections.
- All new mutations are additive (`INSERT` only on `holiday_ledger`) and audit-trailed.
- No automatic recalculation runs on load — the admin must trigger backfills or manual adjustments explicitly (matches project rule "No silent changes").

### Technical detail (engineering reference)
- New hook `useEntitlementBasisCalculator(employeeId, basis, leaveYear, periodId)` returns `{ accrued, carryOver, taken, paid, manualAdjustments, balance, sourceRows }`.
- New component `<EntitlementBasisSelector>` (radio group + descriptions) inside `SettleLeaverDialog.tsx`.
- New component `<HolidaySourceComparisonTable>` reused by SettleLeaverDialog and InvestigateLedgerDialog.
- New lib `src/lib/holiday-entitlement-basis.ts` — pure functions per basis option, deterministic and unit-tested.
- New SQL migration: none required — table shape already supports `manual_adjustment` and the new code only reads existing tables and inserts ledger rows through the existing `useReverseOrphanLedgerEntry` / new `useInsertLedgerAdjustment` hook (permission-gated).

### Out of scope (will NOT touch)
- Payroll calculation, NMW logic, service-charge logic, rate sources.
- Employee profile fields, contract terms, rate history.
- Schedule, shift, timesheet logic.
- Any existing approved/locked payroll period.

## Answers to your specific questions
1. **Which is correct?** Neither is fully correct. The Settle Leaver figure correctly applies the ledger but the ledger is missing 30.71h of legitimate 2026 accruals and contains a 187h orphan taken row. The Holiday tab correctly sees the accrual but ignores the 187h taken record.
2. **Why different accrued?** Ledger has only 1 of 5 2026 payroll_entries (auto-backfill stopped). Holiday tab sums all 5.
3. **Why 0 vs 187 taken?** No `holiday_payments` exists for 2026; the 187h lives only on the `holiday_balances` snapshot and an orphan ledger row.
4. **Settlement using current period only?** No — it uses the full leave year ledger via `useHolidayYearSummary`.
5. **Historical leave pulled in but hidden?** Yes — the 187h orphan from a snapshot.
6. **Previous-year records included incorrectly?** Carry-over of 182.05h is consistent across all three sources.
7. **Carry-over correct?** Yes.
8. **Different source of truth?** Yes — Holiday tab uses payroll_entries + holiday_payments + holiday_balances; Settle Leaver uses ledger.
9. **Ledger / snapshot / live aligned?** Snapshot and ledger agree; Holidays tab disagrees.
10. **Affects only Kazumi?** Likely affects any employee with 2026 payroll_entries created after the auto-backfill stopped, plus anyone with `holiday_balances.hours_taken` not backed by holiday_payments. Detector in step B1 will list them.
11. **Employees with approved hours but missing accrual?** Yes — same detector will surface them.

Shall I implement?