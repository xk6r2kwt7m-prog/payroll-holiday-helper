# A02 clock server correction: review before deployment

Base: main at `8909ff1`. That base already contains Lovable's A01/A02 changes together. This draft adds only server clock checks and synthetic tests; it does not split the original changes in main. A01 database permission enforcement belongs in a different draft.

## Findings reproduced in source

- The service account writes `time_entries` and bypasses ordinary row policies. The original A02 handler trusted a supplied `shift_id` without checking shift ownership or workspace; it also took a caller-supplied branch without confirming it exists in the employee's workspace.
- Failed reads of the active entry were treated as no entry for clock-in, allowing a new insertion after a transient error. For clock-out, read failure was presented as no clock-in. Multiple active entries resulted in a generic missing-entry message.
- The old geofence loop accepted GPS near any branch while recording the caller's selected branch, even if it was somewhere else.

## Proposed change

The handler validates the selected branch against `branch_locations` of the resolved employee's workspace, checks a supplied shift ID belongs to that employee, tenant and branch and is scheduled, distinguishes failed reads from an actual absence, rejects multiple active entries, and conditions clock-out updates on the entry still being open in that workspace. It still derives the employee and workspace from the signed-in account. Only this handler and a synthetic request test change.

## Evidence

`src/test/a02-clock-server.test.ts` invokes the handler with a synthetic user and fake database. The ten tests cover foreign workspace shift, other employee shift, unknown branch, GPS near a different branch, failed employee/branch/open-entry read, duplicate open entries, matching shift and successful clock-out. These do not substitute for deployment or a real isolated Supabase database test. TypeScript, structure check, whole app suite and build results accompany the PR.

## Release blockers and preserved decisions

1. **Active membership:** One currently linked employee was reported to lack tenant membership. Do not silently grant membership or turn on a blanket new membership check without a plan that preserves their clocking. Confirm the association and correct the legitimate staff access through a separately reviewed admin workflow, then test revoked membership at the server. Currently, a linked employee may still clock with a valid login after membership revocation; this patch does not address it.
2. **Geolocation policy:** Browser coordinates can be omitted and are not independently trusted by this function. Decide the acceptable clocking policy for denied GPS/offline and branch transfer; a GPS-only change may block staff and will not prove physical presence.
3. **Shift date:** The fallback shift lookup uses the UTC date and does not model overnight shifts or branch timezone. Test both before deploying this handler. A supplied valid shift ID passes the added ownership checks.
4. **Multiple roles:** A01's global `user_roles` may not match the active tenant and an explicit `approve_timesheets=false` is still not enforced by database write rules. Keep the A01 release blocked until database enforcement and active membership policy are separately prepared and tested.
5. **Branch configuration:** Every active site used by clocking must have a matching `branch_locations` row. Inspect fictional/test configurations before deploying. Database unavailability now shows a retryable error.
6. **Commit state:** The A01/A02 work has already been pushed together to main by Lovable; these cannot become independent PR diffs against main without changing that history. This draft is an incremental correction. Future releases should be separate branches from the same reviewed base before synchronization.

## Handover to Lovable

Review this draft against the current main. Test with fictional staff on a separate database: allowed clock-in/out, wrong shift and branch, failed branch and entry reads, two open entries, stale clock-out and overnight shift. Check the one real staff account only through an authorised read-only membership check; no manual editing. Report a release order with the A01 database permission fix and a membership transition, plus how the server deployment can be reversed without silently discarding clock evidence. Do not deploy the function until the tests and membership decision are resolved. Keep payroll/holiday rules and actual staff records unchanged.
