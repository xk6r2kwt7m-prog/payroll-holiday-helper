# A02 follow-up: refuse clocking for explicitly revoked workspace members

Stacked draft: review after PR #16, independently from the A01 permission changes.
No database migration or record edits are included.

## Behaviour

The clock handler checks the signed-in user's membership in the employee's own workspace, using the server client. If a membership exists with `is_active=false`, both clock-in and clock-out return 403 before changing a time entry. A database lookup failure returns 503. An active membership continues normally. A **missing** membership row continues to clock temporarily because a known legitimate linked employee lacks one; neither the handler nor this draft grants them a role. Resolve that association with a reviewed admin step before replacing the temporary legacy exception with a strict active-membership requirement.

An employee already clocked in when access is revoked cannot self clock out. A manager must reconcile that open entry with evidence and an audit reason. Communicate this operational consequence before enabling the new handler.

## Checks and release sequence

Synthetic request tests exercise active, revoked, missing and failed membership checks; the revised private Postgres harness includes refused clock-in and clock-out and checks that no time entry changes. The updated harness has **not yet run** on the private database. Lovable should run it with fictional staff, verify the exact GitHub commit and test the open-entry reconciliation screen. Read-only inspect the legitimate staff member's association and agree the admin correction separately. Deploy this handler only after PR #16 and a successful private test. Reversion is redeploying the previous handler; preserve all time entries and audit history.

The separately requested A01 timesheet permission enforcement and tenant-scoped role resolution remain distinct drafts, not part of this handler.
