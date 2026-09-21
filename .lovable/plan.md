# Correct payroll starter details

## Confirmed findings

- Every staff record has dedicated **Start date** and **National Insurance number** fields, and the Add Staff form saves both into that record.
- The protected National Insurance value must be loaded through the administrator-only secure reader. The main payroll PDF does this, but the configurable PDF window currently does not.
- In the current saved staff records:
  - **Lotanna** and **Pyae** have National Insurance values; **Franki, Hsin Yu and Daniel** do not.
  - **Hsin Yu** and **Pyae** have start dates; **Franki, Lotanna and Daniel** have blank start dates.
- Daniel’s submitted onboarding information contains a National Insurance entry under a differently named onboarding field. It was not copied into his approved staff record.
- Approved contract evidence contains effective dates for Franki, Lotanna and Daniel, but the payroll report intentionally reads the staff record rather than silently substituting contract data.

## Changes

1. Make every payroll PDF path load National Insurance numbers through the same administrator-only secure reader.
2. Keep the staff record as the sole displayed source for Start date and National Insurance number.
3. Add a clear administrator review for staff whose approved onboarding or contract evidence differs from the staff record.
4. Let the administrator confirm each proposed correction individually before updating the staff record.
5. Record every approved correction in the audit trail, including the evidence source and previous value.
6. Re-check the September 2026 Starters & Leavers report after approved corrections, including the phone-sized PDF flow.

## Safeguards

- Do not alter signed contracts, onboarding submissions, historical payroll, or original evidence.
- Do not infer or invent missing values.
- Do not update any staff record without explicit administrator confirmation.
- Do not send emails or links.
- Keep payroll information administrator-only and protected.

## Technical details

- Reuse the existing protected-field reader across the quick PDF, configurable PDF, print, preview, and email attachment paths.
- Normalize known onboarding field aliases only for comparison; never auto-promote them into the staff record.
- Use contract effective dates only as review evidence, not as a silent report fallback.
