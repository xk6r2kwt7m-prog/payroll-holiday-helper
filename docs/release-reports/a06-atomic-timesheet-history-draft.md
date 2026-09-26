# A06 — atomic timesheet history draft

Status: **code draft; no database installation, service deployment or publication.**
Base: project `main` after Lovable applied #24–#31. Requires the proposed #27 manager-timesheet permission rule to be assessed separately.

## Problem and change

Manager approval commits a time entry, then attempts an independent browser audit insert. The current audit policy refuses managers; the screen reports an error after the approval has already saved. Manager add/edit ignores the denied audit write. The clock service writes no audit row. This draft replaces all of those secondary requests with an `AFTER` database trigger: the time-entry change and its history insert commit or fail together. Rejection, manager override, staff clock in/out and deletion also use that trigger. The manager approval reason and approval mode are stored on the entry and copied to the history snapshot. Staff and managers receive **no new direct audit-log permissions**.

Snapshots contain the employee and workspace identifiers, time and status changes, review/adjustment reasons, and location availability/geofence result. They **exclude raw latitude and longitude**. Service-key writes are labeled `actor_source=server` with null `user_id`, avoiding a claim that the database authenticated an individual for that write; the record still contains `employee_id`.

The new `timesheet_history_ready()` check refuses app and clock-service writes if this trigger is absent or disabled. Because preview and production currently share a backend, the preview app will refuse manager timesheet mutations until the SQL is separately approved and installed. **Never deploy the new clock service before the SQL**, since staff clock in/out would fail closed.

## Scope

Migration proposal: `supabase/pending-migrations/20260926170000_atomic_timesheet_history.proposed.sql`. Adds two nullable columns (`approval_review_reason`, `approval_mode`), an audit snapshot helper, an AFTER trigger and readiness function. No existing row is rewritten or deleted. Rollback in `rollback/20260926170000_atomic_timesheet_history.down.sql` removes the trigger/functions **but deliberately retains the new columns and all history records**. Regenerate Supabase types after installation; the preview uses a local cast until then.

App consumers: `useManagerAddTimeEntry`, `useManagerEditTimeEntry`, `useApproveTimeEntries`, `useRejectTimeEntry`, `useManagerOverride`, `ManagerTimesheetDialog`, `TimesheetReviewPanel`, and `clock-in-out`. The add/edit/approve/reject paths no longer insert history through the browser. The clock service checks readiness before writing. No payroll, holiday, rota calculation or GPS decision logic changed.

## Verification and release gates

- Local app: type check, architecture check, focused client tests and the full app suite/build pass. Client tests confirm a failed audit-enabled mutation is reported as a failed mutation, and a missing server guard refuses the write before any save.
- Database: `tests/isolated/a06_atomic_timesheet_history.py` **prepared, not run here**; this workspace has no private PostgreSQL test server. Its hardcoded `/tmp/iso` socket and fictional fixtures prevent an accidental connection to the shared database. Test manager create/edit/approve, server clock events, raw coordinate redaction, denied direct manager audit insert, forced audit failure rollback, #27 permission-off interaction and undo. Lovable must run it on the exact SQL with fictional staff and report results.
- Clock integration: `a02_clock_iso.mjs` now asks the private database's readiness function and tests the refused path. Run the clock test again after installing A06 in the private `a02` database, including the prior overnight/DST/concurrency matrix.
- Signed-in private preview: repeat manager approval/edit/add and staff clock-in/out; verify **one history row per real change**, one cause shown for failure, no extra row on retry, actor label and tenant boundary. Inspect a manager's flagged reason and ensure no raw coordinates appear in history.
- Before shared installation: review the exact SQL, confirm latest backup and release/rollback order. Coordinate app and service deployment with the SQL. A rollback of the SQL alone makes the new app/service refuse further writes; revert the matching code or install an approved replacement in the same release window.

## Remaining separately scoped work

This trigger makes history atomic; it **does not** enforce #31's flagged-entry/batch eligibility in the database or make a multi-entry approval all-or-nothing. A direct authorized database write can still bypass the screen's flag review. GPS accuracy policy, #28 role-screen verification, missing workspace membership reconciliation and the #27 production approval also remain open. Do not label this draft a complete timesheet-approval safety fix.
