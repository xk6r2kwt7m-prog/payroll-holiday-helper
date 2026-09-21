# Fix the payroll report showing saved staff details as "Missing"

## What I confirmed (no records changed)

The details are genuinely saved. Checked just now for the five September starters:

| Person | Start date | NI number | Bank details | Right-to-work evidence |
|---|---|---|---|---|
| Franki Lee Templeman | 11 Sep 2026 | saved | saved | not saved |
| Hsin Yu Tsai | 29 Aug 2026 | not saved | saved | not saved |
| Lotanna Moore-Okoli | 25 Aug 2026 | saved | saved | saved |
| Pyae Hmue Pan Pan | 28 Aug 2026 | saved | saved | saved |
| Sang Hyun Daniel Lee | 5 Sep 2026 | saved | saved | saved |

So the report is wrong, not the records. Two separate causes in the report code:

1. The window opened from the "PDF" button builds the Starters & Leavers page from the ordinary staff list, which by design never carries the protected NI and bank values. That page therefore shows "Missing" for everyone, every time, no matter what is saved. This is the cause of what you photographed.
2. The other download route does load the protected values, but keeps them in a short-lived memory copy that is not refreshed when a staff record is saved. A report generated shortly after an edit can still use the pre-edit copy.

Right-to-work on the report is derived from those same protected values, so it inherits the same fault.

## Fix

1. Make the "PDF" window load the protected NI, bank and right-to-work values through the existing admin-only protected-data route, and merge them into the Starters & Leavers rows exactly as the other download route already does. Same for the Print route in that window.
2. Refresh the protected-data copy whenever a staff record is saved, so reports generated straight after an edit use the current values.
3. Keep the admin-only protection intact: if the person generating the report is not an administrator, the protected columns stay masked rather than silently blank.
4. Regenerate the September 2026 report and verify the five starters against the table above.

No calculation, pay, holiday or contract logic changes. No records are edited. Nothing is emailed.

## Two things for you to confirm separately

- Hsin Yu Tsai still has no NI number saved, and Franki and Hsin Yu have no right-to-work evidence saved. After the fix the report will correctly show those as missing.
- Daniel's saved start date is now 5 September 2026, while his employment-terms and contract records previously indicated 17 or 18 September. I have not changed anything — please confirm which date is correct before any report is treated as final.

## Technical details

- `PayrollReportBuilder.tsx` `handleGeneratePDF` / `handlePrint`: merge `ni_number`, `sort_code`, `bank_account_no`, `passport_no`, `sharing_code`, `residence_permit` from `useTenantSensitiveFields` into `starterEmployees`, mirroring `Payroll.tsx` `handleDownloadPDF`.
- `useUpdateEmployee` in `useEmployees.ts`: also invalidate the `tenant-sensitive` and `employee-sensitive` query keys on success.
- No schema, RLS or RPC changes; the existing `tenant_sensitive_fields` admin gate remains the sole access path.
