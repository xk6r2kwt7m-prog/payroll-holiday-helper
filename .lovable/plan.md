# Correct start dates for the latest payroll

## Scope

Use only the **September 2026 payroll period (24 August–20 September)** and the five staff appearing there for the first time. Do not review or change previous employees.

## Confirmed comparison

| Employee | Staff record | Signed contract evidence | Action |
|---|---:|---:|---|
| Hsin Yu Tsai | 29 Aug 2026 | No recent signed-app contract found | Keep unchanged |
| Pyae Hmue Pan Pan | 28 Aug 2026 | 28 Aug 2026 | Already correct; keep unchanged |
| Franki Lee Templeman | Blank | Contract Start date: 18 Sep 2026 | Propose 18 Sep 2026 |
| Lotanna Oyokomino Moore-Okoli | Blank | Contract Start date: 18 Sep 2026 | Propose 18 Sep 2026 |
| Sang Hyun Daniel Lee | Blank | Date is not retained in the contract snapshot; employment terms disagree between 17 and 18 Sep | Read the immutable signed PDF and require confirmation before changing |

The signature date will not be used as the start date. The source is the **Start date / Effective date printed in the signed contract**.

## Changes

1. Add a focused administrator review for these latest-payroll starters, showing Staff date beside signed-contract Start date.
2. Pre-fill only dates supported by the signed contract; never silently apply them.
3. Let the administrator approve each correction individually.
4. On approval, update only the employee’s Staff start date and write an audit record containing the previous value, new value, contract reference, and approving administrator.
5. Keep signed contract files, contract dates, payroll figures, and historical records unchanged.
6. Rebuild and verify the September Starters & Leavers PDF after the approved corrections.
7. Prevent recurrence: when a newly signed contract has a confirmed Start date and the Staff date is blank, create an administrator review item rather than silently copying or losing the date.

## Safeguards

- No manual re-entry where signed evidence already exists.
- No use of contract signature dates as employment start dates.
- No correction where sources conflict or the signed date cannot be verified.
- No emails, secure links, status changes, contract reissues, or historical migration.
- Payroll remains administrator-only; signed contracts remain byte-for-byte unchanged.

## Technical details

- Treat `terms_snapshot.variables.effectiveDate` as the preserved contract Start date when present.
- Do not use later `employee_contract_terms.effective_from` when it conflicts with the signed snapshot.
- For Daniel, inspect the stored final signed PDF because the original snapshot lacks the date; stop for administrator confirmation if the printed value cannot be read reliably.
- Record accepted updates in the existing employee change and audit trails.
