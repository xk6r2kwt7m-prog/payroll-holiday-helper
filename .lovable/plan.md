# Fix the wrong "Starter" label in Record Holiday Taken

## What is happening

The staff list inside **Record Holiday Taken** marks long-standing people as **Starter**. They are not starters, and nothing about their pay, holiday or records is affected — it is only the small label in that one list.

Cause, confirmed against the live records: the label is worked out from the employment start date. When no start date is held, the list falls back to "we have not seen this person in an earlier pay run" — and in that dialog it is never told which earlier pay runs to look at, so everyone without a start date is labelled a starter. 24 of the 32 currently employed people have no start date on file, which is exactly what the picture shows.

## The quick fix

In this one dialog only:

- Show **Starter** only when the person's own recorded start date falls inside the selected pay period.
- Never show it for someone recorded as currently employed or as a leaver.
- Drop the "not seen before" guess here — with no earlier pay runs to compare against it produces false labels.
- Leave the **Leaver** label as it is.

Nothing else changes: no records, dates, balances, payroll figures or other screens are touched, and no statuses are edited.

## Separate note for you (no change proposed)

24 currently employed people have no start date recorded. That is worth filling in at some point, because start dates also drive holiday entitlement from the correct date. I will not add or guess any dates.

## Technical detail

- `src/components/holidays/AddHolidayPaymentDialog.tsx` — the `starterHere` computation currently calls `isStarterInPeriod(emp, periodCtx)` with no `priorPeriodEmployeeIds`, so the no-`start_date` fallback branch always returns true. Replace with a period-only check: true only when `emp.start_date` falls within the selected period, and `emp.status` is not `leaver`.
- `src/lib/employee-period-relevance.ts` stays unchanged — other payroll surfaces pass the prior-period ids correctly and rely on the fallback.
- Add a small test in `src/test/` covering: no start date -> no Starter badge; start date inside the period -> Starter; start date in an earlier period -> no Starter.
