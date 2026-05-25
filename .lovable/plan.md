## Payroll Timesheet Import — Saved Alias & Manual Matching

### Goal
Stop re-asking managers about the same unclear timesheet names. When a manager confirms a match once, remember it as a safe **import alias** that auto-matches in future imports — without ever changing the employee's legal name or profile.

### What I'll build

**1. Storage (schema change — needs your approval)**

A new dedicated `payroll_import_aliases` table is the safest option (separate from the legacy `employees.import_aliases` array, which has no audit trail, no usage tracking, no source attribution, and can't be deactivated cleanly).

Fields:
- `id`, `tenant_id`, `branch_id` (nullable)
- `source_system` (`uploaded_timesheet` | `csv_import` | `deputy`)
- `raw_timesheet_name`, `normalised_timesheet_name`
- `employee_id` (FK to employees)
- `confirmed_by`, `confirmed_at`
- `last_used_at`, `usage_count`
- `is_active` (soft deactivate, never hard delete)
- Unique on `(tenant_id, normalised_timesheet_name, source_system)` where `is_active = true`
- RLS: tenant-scoped, manager+ to read, manager+ to write

No payroll, NMW, service-charge, approval or audit logic touched.

**2. Matching priority (updated `src/lib/payroll-matching.ts`)**

```
1. Employee ID (if column present)
2. Email (if column present)
3. Saved alias (new — from payroll_import_aliases)
4. Exact full-name (unique active employee)
5. Strong unique likely match (existing alias array / preferred / legacy map)
6. → Manual manager selection
```

Conflict rules: if file has an ID/email that points to a *different* employee than a saved alias, alias is ignored and row is flagged ambiguous.

**3. Manual confirmation UI**

In the existing **Unresolved Issues** panel (`UnresolvedIssuesPanel` / `usePayrollImportStatus`), when a manager picks an employee for an unmatched name, add a checkbox:

> ☑ Remember this match for future imports

If checked → insert into `payroll_import_aliases`. If unchecked → one-time match only.

**4. Alias safety**

Block / require re-review when:
- Same raw name maps to >1 active employee (ambiguous)
- Target employee is `leaver` or `archived` (inactive)
- Branch mismatch (warn, where branch context is set)
- Alias conflicts with file-supplied ID/email
- Two timesheet rows resolve to the same employee
- Alias `is_active = false`

**5. Alias management screen**

New tab inside **Payroll → Import** (or Settings → Payroll): `TimesheetAliasManager`
- List active + inactive aliases
- Show employee, source, last used, usage count, confirmed by/at
- Deactivate / reactivate
- Re-point to a different employee (creates new row, deactivates old — preserves history)

**6. Import review screen**

Extend the existing pre-import review to show a `matchSource` column per row:
`Employee ID | Email | Saved alias | Exact name | Likely match | Manual | Unmatched | Ambiguous`

Plus a "Missing from file" section listing active employees not in the upload (warning, non-blocking).

**7. Import blocking**

Final Import button disabled until: no ambiguous, no unmatched (unless explicitly excluded), no duplicate target mappings, no alias conflicts, no inactive selections, period not approved/locked.

**8. Draft preservation (already in place — preserved as-is)**

Existing draft → update `timesheet_hours` only. Rates, bonuses, service charge, manual adjustments, copied values untouched. Approved periods remain fully protected.

**9. Tests**

New file `src/test/phase-payroll-import-aliases.test.ts` covering all 23 cases you listed (exact match, manual save, alias reuse, alias does not mutate legal name, alias preview source, conflict/inactive/branch/ID/email override rules, deactivation, blocking rules, draft preservation, approved-period protection, no-logic-change assertions).

### Files

**New**
- `supabase/migrations/<ts>_payroll_import_aliases.sql`
- `src/hooks/usePayrollImportAliases.ts`
- `src/components/payroll/TimesheetAliasManager.tsx`
- `src/components/payroll/ImportReviewTable.tsx` (match-source column + missing-employees panel)
- `src/test/phase-payroll-import-aliases.test.ts`

**Edited (surgical)**
- `src/lib/payroll-matching.ts` — add `saved_alias` tier + ID/email tiers
- `src/hooks/usePayrollImportStatus.ts` — surface match source, conflict detection
- `src/components/payroll/ImportPayrollDialog.tsx` — manual-match "Remember" checkbox, review step, blocking
- Wherever `UnresolvedIssuesPanel` is wired — pass alias-save callback

### Out of scope (per your guardrails)
- No changes to NMW, payroll calc, service-charge, approval, audit, holiday, contract, profile logic
- No employee legal-name mutation
- No hard deletes (deactivate only)
- No silent automatic alias creation — always requires manager confirmation

### Approval needed
Schema change for `payroll_import_aliases`. Approve and I'll run the migration, then build the matching + UI + tests.
