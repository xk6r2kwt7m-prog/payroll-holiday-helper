# A05 draft: use the active workspace's role for timesheet permissions and route gates

This app-only patch is stacked after A04's database guard. It changes no database row and contains no migration. A manager role in workspace A must never supply manager controls in workspace B, nor survive revoked membership in the mutation-time check.

## Code path

- Convert `tenant_members.role` for the active workspace to the app's existing permission labels (`company_admin → admin`, `employee → staff`; manager, supervisor and viewer retain their names). Only a resolved, active membership can grant the route and permission decision. Loading/failed workspace selection is unresolved, not a default grant.
- The time-entry mutation guard rereads the active membership, including `is_active=true`, immediately before writing. An error refuses the mutation; no membership refuses access. The existing platform-admin path remains. Company admin retains the existing full-access decision. The workspace's role permission overrides retain their explicit-false behaviour.
- Protected routes use the active workspace role for their minimum-role gate. The shared `usePermissionDecision` uses the same workspace role instead of a global `user_roles` value.

## Checks before release

The unit tests include an employee in workspace B with a manager role elsewhere, a missing membership, overrides, a failed membership read and unchanged admin behaviour. Check with fictional two-workspace users in a signed-in private app: switch workspace, deactivate membership during a session, refresh, attempt direct timesheet approval, test ordinary manager access and platform administrator access. Run the app suite and build against the exact branch.

**Remaining scope:** Other screens still consume the legacy global `useAuth().role`, `isAdmin` or `isManagerOrAbove` directly. This patch limits the timesheet permission and common protected-route gates; it does **not** assert that every feature's internal controls are fully scoped. Audit and migrate those consumers in smaller feature-specific drafts. Do not change `user_roles` data or backfill tenant memberships without a separate review. Server and database rules remain the source of truth for sensitive writes.
