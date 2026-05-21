# Contract Amendment System — Operational Safety Audit & Next Phase

## 1. Current source of truth (audit findings)

| Operational concern | Reads from | Evidence |
|---|---|---|
| Payroll entry rate (at creation) | `employees.hourly_rate` snapshotted into `payroll_entries.hourly_rate` | `usePayroll.ts:68,406`, `AddEmployeeToPeriodDialog.tsx:62-72`, `CreatePayrollDialog.tsx:94`, `ImportPayrollDialog.tsx:266,403` |
| Payroll edits ("update employee master") | Writes back to `employees.hourly_rate` | `EditablePayrollTable.tsx:278-300,392-398` |
| Live labour cost / today's cost | `employees.hourly_rate` joined live | `useLabourCost.ts:57-71`, `LiveLabourDashboard.tsx:29` |
| Rota costing & forecasts | `employees.hourly_rate` joined live | `ScheduleReport.tsx:90`, `ShiftCellDialog`, `ScheduleAnalytics` |
| Financial dashboard / past cost | `employees.hourly_rate` joined live (mutates retroactively) | `useFinancialData.ts:113-150` |
| Minimum-wage check | `employees.hourly_rate` + `date_of_birth` in form only | `EmployeeFormDialog`, `lib/uk-minimum-wage.ts` |
| Department / role / workplace / contracted hours | `employees.*` directly (mutable) | profile form, `EmployeeBranches`, etc. |
| Signed contract terms | Stored only in PDF + `extracted_data` / `field_changes` jsonb on `employee_documents` | not joined to anything operational |

**Conclusion: signed contracts do not feed any operational calculation.** They are document-safe but operationally inert.

## 2. Risks

1. **Silent drift** — signing a £13.50 amendment without remembering to update `employees.hourly_rate` leaves every future payroll, rota cost, and NMW check on the stale rate.
2. **Retroactive cost mutation** — `useFinancialData`, `useLabourCost`, `LiveLabourDashboard`, `ScheduleAnalytics` recompute past labour cost by joining `employees.hourly_rate` *as it is today*. Editing the profile silently rewrites "what last week cost". Violates the project rule: no silent changes to historical data.
3. **No effective-dated terms** — a contract signed today to start 1 June cannot be represented. Activation is a manual profile edit on the morning.
4. **NMW check is profile-only, not period-based** — does not use actual hours × actual eligible pay per reference period, the HMRC test.
5. **Material profile edits bypass the contract** — department, role, branch, pay type, contracted hours can all be changed freely with no signed amendment.
6. **Payroll "update master" path** mutates `employees.hourly_rate` from inside payroll, with no link to any contract amendment.

## 3. Recommended data model — `employee_contract_terms`

Append-only table; one row per effective term-set per employee.

```
employee_contract_terms
  id                   uuid pk
  tenant_id            uuid not null
  employee_id          uuid not null
  contract_id          uuid not null  -- employee_documents.id (signed version)
  source_amendment_id  uuid           -- contract_amendments.id, null for v1
  version_number       int  not null
  effective_from       date not null
  effective_to         date           -- null = open-ended/current
  status               text not null  -- scheduled | active | superseded | terminated
  hourly_rate          numeric(10,2)
  annual_salary        numeric(12,2)
  pay_type             text           -- hourly | salary
  contracted_hours     numeric(5,2)
  contracted_hours_basis text         -- weekly | monthly | variable
  department           text
  role_title           text
  work_location        text
  employment_type      text           -- full_time | part_time | variable_hours
  is_apprentice        boolean default false
  probation_end_date   date
  notice_period_weeks  int
  overtime_model       text
  holiday_entitlement_method text
  service_charge_eligible boolean
  created_at           timestamptz default now()
  created_by           uuid
```

Constraints / safety:
- Unique `(employee_id, effective_from)`.
- Exclusion constraint: no two `active` rows for the same employee overlap.
- Trigger: inserting a row with `status='active'` closes the previous active row (`effective_to = new.effective_from - 1`, `status='superseded'`).
- App-layer is **insert-only**. Updates blocked by trigger except for `status` and `effective_to` transitions.
- RLS: tenant-scoped, manager-or-above for select, admin for insert.

## 4. Activation logic

- v1 contract signed → insert row with `effective_from = max(employee.start_date, signed_at)`, status = `active`.
- Amendment signed → insert row with `effective_from = amendment.effective_date`.
  - if `effective_from <= today` → status `active`, immediately close previous row.
  - if `effective_from >  today` → status `scheduled`; previous active row stays active.
- Daily cron flips `scheduled → active` and closes prior row when their date arrives.
- Contract terminated → set `effective_to = terminated_at`, status `terminated`.

## 5. Payroll integration

- New resolver `getEffectiveTerms(employee_id, asOfDate)` returns the row where `effective_from <= asOfDate AND (effective_to IS NULL OR effective_to >= asOfDate)`.
- `AddEmployeeToPeriodDialog`, `CreatePayrollDialog`, `ImportPayrollDialog` read rate from terms as-of **period end date**, not from `employees.hourly_rate`.
- Historical periods recompute against terms as-of their own period — past totals never shift again.
- `payroll_entries` continues to snapshot at creation (already correct).
- `EditablePayrollTable` "update employee master" path is removed in favour of "create contract amendment" CTA. Direct overrides on a single entry remain allowed (period-scoped only, already audited).
- Rota/labour reads (`useLabourCost`, `useFinancialData`, `LiveLabourDashboard`, `ScheduleReport`, `ScheduleAnalytics`) switch to resolver as-of shift date.

## 6. Minimum wage integration

Per-pay-period engine:
1. Resolve employee age on **first day of the pay reference period**.
2. Resolve `is_apprentice` and active terms for the period.
3. Pick legal minimum from `UK_WAGE_RATES` for that band on that date.
4. Compute eligible pay (basic pay, exclude tips/service charge/expenses) and actual hours from approved timesheets.
5. `effective_rate = eligible_pay / actual_hours`.
6. If `effective_rate < legal_minimum` → block period approval unless admin records an override reason → `audit_log`.
7. Form-side check (`MinimumWageCheck`) stays as early warning only — explicitly labelled.

## 7. UI implications

- **Employee profile**: "Current terms" card sourced from active row, with caption "Source: Contract v2 (signed 12 Mar 2026)". Material fields become read-only with "Create amendment" CTA.
- **Contract tab**: version timeline already exists — add status pills `v1 Superseded · v2 Active · v3 Scheduled 1 Jun`.
- **Payroll detail**: rate cell shows source ("from Contract v2"); warn if entry rate differs from terms-as-of-period.
- **Minimum wage compliance screen**: per-period table — age that period, band, legal min, effective rate, status, override reason.
- **Dashboard**: banner for scheduled amendments activating within 14 days.

## 8. Safest implementation order (no edits yet)

1. **Schema only** behind feature flag. Backfill one `active` row per employee from current `employees.*`.
2. **Write path**: extend `sign-contract` edge function and `useContractAmendments` to insert into `employee_contract_terms` on signature.
3. **Trigger-sync `employees.*` from active terms row** (one-way) so legacy reads keep working during rollout.
4. **Switch payroll reads** (`AddEmployeeToPeriodDialog`, `CreatePayrollDialog`, `ImportPayrollDialog`, `usePayroll`) to resolver as-of period end.
5. **Period-level NMW engine** with block + override at approve.
6. **Switch rota/labour reads** (`useLabourCost`, `useFinancialData`, `LiveLabourDashboard`, `ScheduleReport`, `ScheduleAnalytics`) to resolver as-of shift date.
7. **Lock profile material-field edits** behind "Create amendment" CTA; keep audit-logged override escape hatch.
8. **UI surfacing**: timeline pills, source captions, scheduled banner, NMW screen.

## Files likely affected

- DB: new migration (table + triggers + RLS + resolver SQL fn `get_effective_terms`).
- Hooks: `useContractAmendments` (extend), new `useEmployeeContractTerms`, `useLabourCost`, `useFinancialData`, `useNmwCompliance`.
- Payroll: `usePayroll`, `AddEmployeeToPeriodDialog`, `CreatePayrollDialog`, `ImportPayrollDialog`, `EditablePayrollTable`.
- Rota: `ScheduleReport`, `ScheduleAnalytics`, `ShiftCellDialog`, `LiveLabourDashboard`.
- Employees: `EmployeeFormDialog`, `MinimumWageCheck`, profile Work tab.
- Contracts: `ContractVersionTimeline`, `CreateAmendmentDialog`, `SignedContractsList`.
- Edge: `sign-contract`.
- Audit: reuse existing `audit_log`.

## Guardrails (non-negotiable)

- `payroll_entries` and signed contract PDFs / hashes are never mutated.
- `employee_contract_terms` is append-only.
- Any direct `employees.*` material edit outside the amendment flow requires an override reason → `audit_log`.
- All historical reports must remain reproducible bit-for-bit after the migration.
