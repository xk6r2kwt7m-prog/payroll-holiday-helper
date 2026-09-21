# Timesheet import: only offer staff who are genuinely still available

## The problem

When a name on the uploaded timesheet cannot be matched, the dropdown next to it currently lists **every** person ever held on the record — including leavers, archived people and practice records — and it keeps offering people who have already been matched to another row in the same upload. That makes it easy to attach hours to the wrong person.

## What will change

For each unmatched row, the dropdown will offer only:

- People who are currently employed: active, starter or onboarding.
- People not already matched to another row in this same upload.
- People who are not archived.
- No leavers, no archived records, no practice records.

One deliberate exception: a leaver whose last day falls **inside** the pay period being imported still has final pay owed, so they will remain selectable and be shown as "Leaver — final pay in this period". Anyone who left before the period started disappears from the list entirely. (Say the word if you would rather they never appear at all.)

Alongside the dropdown:

- It will say how many names are left to choose from, so an empty list reads as "no remaining staff to match — create the person or exclude the row" instead of looking broken.
- Once someone is picked for one row, they drop out of the list for the other rows.
- The existing **Create** and **Exclude** buttons stay exactly as they are.

Nothing about how names are matched automatically changes, no pay figures change, and no records are edited — this only narrows the list of people you are offered.

## Technical notes

- `src/components/payroll/ImportPayrollDialog.tsx`, unmatched-row `Select` (around lines 1160–1177): replace the unfiltered `employees` map with a memoised `assignableEmployees` list derived from `matchableEmployees`.
- Filter rules: `archived_at === null`, `is_test_record !== true`, status in `active | starter | onboarding`, plus leavers where `leaverPayableInPeriod(e, periodCtx)` is true (helper already exported from `src/lib/payroll-matching.ts`).
- Exclude ids already taken: build a `Set` of `aggregated.filter(a => a.matchedId && a.resolution !== "excluded").map(a => a.matchedId)`, minus the row currently being resolved.
- `is_test_record` is not in `EMPLOYEE_COLUMNS` for `useEmployees`; add it to the select list and to the `MatchableEmployee` mapping (read-only addition, no schema change).
- Keep `useEmployees(true)` as the source so `handleManualMatch` can still resolve an already-selected id; filtering happens in the dropdown list only.
- Sort remaining names A–Z by forename, as now, keeping the existing `• Starter` suffix and adding the leaver final-pay label.
- Add a test in `src/test/` covering: leaver outside the period hidden, leaver inside the period offered, archived and practice records hidden, already-matched person removed from the remaining list.
