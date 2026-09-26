# A04 draft: make the manager timesheet permission effective in the database

This is a separate, **uninstalled** migration in `supabase/pending-migrations/`. It adds a single trigger and function on `time_entries`; it does not modify existing entries or change the table shape. Matching undo SQL removes exactly those objects. It is independent of the GPS drafts.

## Problem and intended effect

The A01 screen hides approval controls when `role_permissions(tenant_id, 'manager', 'approve_timesheets')` is explicitly false, but the existing database policies still let that manager insert, update, approve or delete a timesheet directly. The proposed trigger checks active manager membership in the entry's workspace on **every direct write**, against that workspace's stored override. It refuses writes when the override is false. With an absent row the existing manager default remains allowed. Company admins retain their access; platform admins retain their existing access; unauthenticated users still depend on existing RLS rules. Internal service jobs have no end-user `auth.uid()` and remain responsible for their own access controls. It does not change timesheet viewing.

It checks both old and new workspace identifiers for an UPDATE. Existing tenant RLS remains in place; this trigger is a second gate because permissive RLS policies on the same table can be combined. The handler is in a new function so its undo is local and does not replace the existing approval or payroll functions.

## Required isolated checks before installing

Run `tests/isolated/a04_timesheet_permission.py` on the private database rebuilt from the project's migrations, with fictional users. The script tests direct UPDATE/INSERT/DELETE refusal, unchanged rows on refusal, the same manager when permission is on or absent, company-admin access and the exact rollback. Also exercise the authenticated manager screen and direct REST endpoint against the private Supabase stack. Test a manager clocking their own shift if that workflow uses direct `time_entries` writes; the current client uses the server function, but other integrations may differ.

No private database is available in this workspace, so no PostgreSQL result is claimed for this draft. Do not install this merely because TypeScript tests pass. Verify any production backup and the current migration fingerprints before deployment. A manager with a switched-off approval permission must still be able to **view** entries if `view_timesheets` is on.

## Separate follow-up

`useAuth` and several screens still read `user_roles` without the active workspace filter. Resolve their role from active `tenant_members` in a separate app draft; do not silently delete old roles or grant new membership. The GPS policy and legacy staff association are separate releases.
