# September starter details review and correction

## Scope
Review only the five first-time starters in the 24 August–20 September 2026 payroll period:
- Hsin Yu Tsai
- Pyae Hmue Pan Pan
- Franki Lee Templeman
- Lotanna Oyokomino Moore-Okoli
- Sang Hyun Daniel Lee

Previous employees and previous payroll periods remain untouched.

## Plan
1. Identify the newly uploaded details and match them to these five staff members without importing or altering anything.
2. Compare each uploaded record against:
   - the existing staff start date;
   - the Start/Effective date printed in the immutable signed contract;
   - the active employment terms for discrepancy checking only.
3. Treat the contract's printed Start/Effective date as the authoritative evidence. Never substitute the signature date. Where evidence conflicts or cannot be read reliably, flag it for administrator confirmation instead of guessing.
4. Present a five-person review showing the current date, evidence-supported date, source document, and any conflict. Require individual administrator approval for every proposed correction.
5. Update only approved missing or incorrect staff start dates. Keep signed contracts byte-for-byte unchanged and do not reissue, migrate, archive, merge, or change any status.
6. Record an immutable audit entry for each approved correction containing the previous value, new value, evidence reference, payroll period, approving administrator, and timestamp.
7. Regenerate the September 2026 Starters & Leavers report from the corrected staff records and verify the five relevant entries.
8. Add a future administrator review warning when a newly signed contract's Start/Effective date is missing from or differs from the staff record. This warning will never change data automatically.

## Safeguards
- No manual re-entry where uploaded or signed evidence is sufficient.
- No emails, links, notifications, or staff contact.
- No NI-number changes unless separately reviewed and approved.
- Payroll access remains administrator-only and confidential.
- No changes to closed-period calculations or historical records.

## Technical details
Use tenant-scoped reads and writes, existing administrator permissions, and the existing audit system. Evidence comparison must remain deterministic and source-linked; unresolved conflicts remain visible and unmodified.
