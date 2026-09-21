# Simplify the payroll checks

Nothing is deleted. Every existing record, adjustment, audit row and historical figure stays exactly as it is. This only changes who the current period's checks look at, how the minimum wage figure is worked out, and what you see first on the page.

## 1. Who the period's checks cover

One shared rule decides inclusion, used by the minimum wage check, the missing-information warning and the issue counts:

- Included: anyone employed during the period, or with pay, hours, holiday pay or a final adjustment falling in the period.
- Excluded: anyone whose leaving date is before the period started with nothing owed in it.
- Excluded: future starters — a start date after the period ends.
- Excluded people are left out of issue counts, missing-information warnings and the minimum wage check entirely.

Their pay lines and history stay untouched and remain visible in the employee record and past periods. If an excluded person still has a line in the period, the detail view lists them under "Former employees — no payment due this period" so nothing disappears silently.

## 2. Minimum wage check

- Statutory rate chosen from the period's own date, the person's age at the start of the period, and apprenticeship status taken from their employment terms (rather than always assuming "not an apprentice").
- From 1 April 2026: £12.71 age 21+, £10.85 ages 18–20, £8.00 under 18 and qualifying apprentices. These figures are already on file and stay as they are.
- Comparison made on full-precision pay and hours; only the figures shown on screen are rounded.
- Paid exactly the legal rate reads **Compliant**, not "At risk". A tolerance of £0.005 is used only to stop rounding noise being reported as a breach.
- Tips and service charge never count towards minimum wage pay.
- Missing age, date of birth, base rate or apprenticeship information reads **Information missing — unable to verify**, never non-compliant.
- A difference between the payroll rate and the contracted rate is shown as its own separate note, clearly not a minimum wage breach.

## 3. What you see

- The top of the page shows only genuine blocking issues.
- Everyone who passes sits behind a collapsed heading, e.g. "Minimum-wage check passed — 35 employees".
- Warnings, missing information and former-employee detail all live under **View details** and never block payroll.

## Technical notes

- `src/lib/employee-period-relevance.ts`: add a future-starter exclusion to `isRelevantToPayrollPeriod` (start date after `period.end_date` and no period activity), keeping current behaviour otherwise.
- `src/hooks/usePayrollMinimumWageCheck.ts`: accept the period end date, an apprenticeship map and holiday/adjustment id sets; filter entries through `isRelevantToPayrollPeriod` before evaluating; return excluded rows separately so they can be listed rather than dropped.
- `src/lib/payroll-nmw.ts`: keep `PENNY_TOLERANCE` at 0.005; add `missing_base_rate` and `missing_apprentice_status` to the `insufficient_data` reasons; add a `contract_rate_mismatch` field (diagnostic only, never affecting status); leave the rate table untouched.
- `src/pages/Payroll.tsx`: pass `periodEndDate`, `termsByEmployee`-derived `is_apprentice`, holiday-payment and adjustment employee ids into the NMW hook and `PayrollMissingInfo`.
- `src/components/payroll/MinimumWageCompliancePanel.tsx`: split the table into blocking rows (rendered open), a collapsed "Minimum-wage check passed — N employees" group, a collapsed "Information missing — unable to verify" group and a collapsed excluded-former-employees list. Contract mismatch becomes its own column note rather than part of the status badge.
- Tests: extend `src/test/phase-nmw-penny-rounding.test.ts` and add coverage for future-starter exclusion, former-employee exclusion with and without a payment due, apprentice band selection, exact-rate compliance, and missing-base-rate classification.
- No migrations, no data writes, no emails.
