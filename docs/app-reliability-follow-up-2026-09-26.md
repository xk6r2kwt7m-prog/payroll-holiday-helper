# Application reliability follow-up — 26 September 2026

Base: `1fecc7683a3b45ccd2e606f7b9425607f2f6bd4f` from current main.
Branch: `fix/app-change-safeguards`.

## Findings and implemented corrections

| Finding | Evidence | Correction |
|---|---|---|
| Delayed role responses can apply after logout/account switch | `useAuth.tsx` published every asynchronous role result without checking which session initiated it | Session generation checks, cancellation on unmount and immediate role reset; stale bootstrap/role responses ignored |
| Old account query data can survive identity changes | Auth provider did not clear the query cache on identity transitions | Clear query and mutation caches when the user ID changes; role refresh for the same user preserves query data |
| Failed bootstrap can remain unresolved; sign-out errors are ignored | Bootstrap had no rejection handler; sign-out discarded its result | Finish bootstrap safely; show a generic sign-out failure message without pretending the session ended |
| Individual employee detail has no explicit company filter/cache key | `useEmployee` keyed only by employee ID and queried only that ID | Require the active tenant, scope the query and cache key to it, and disable reads before selection. Server-side RLS remains required |
| Rendering failures can leave a blank application | Entry point mounted App without an error boundary | Add a generic, accessible recovery screen; do not expose exception details or automatically reload/retry financial actions |
| Missing persistent repository change rules and automated checks | No tracked root AGENTS.md or GitHub workflow at the reviewed base | Add scoped-change/data-safety instructions, a PR review template and read-only GitHub Actions checks for typechecking, tests and build |
| Authentication test asserted source formatting rather than rejection behaviour | Existing regex required an unbraced one-line return | Execute the actual TypeScript guard with mocked SDK/environment and verify 401 rejection before SDK access for absent/anonymous credentials |
| Invitation test changes outcome as the calendar advances | Fixed September expiry compared with the machine clock | Pass an explicit test clock to the existing function; no production invitation logic changed |

The new files and edits are limited to these findings. No payroll formulas, contract terms, onboarding content, shared styles or database definitions were altered in this follow-up.

## Verification

Unchanged latest-main baseline: 1,764 passed, 2 failed (the authentication formatting assertion and time-dependent invitation test).

After changes: **1,779 passed, 0 failed, 124 files**. Thirteen new behavioural cases cover session races, bootstrap/role failures, sign-out failure feedback, account-cache clearing, workspace-isolated employee queries and render-error recovery. The existing authentication and invitation tests were corrected without removing their intended checks.

TypeScript application check passed. Production build passed. Existing bundle-size and dependency annotation warnings remain; this work is not a performance refactor. Whitespace check passed.

## Scope and limitations

- AGENTS.md is guidance, not an access control. The workflow provides checks after it is enabled/runs; it does not itself prohibit direct pushes or require a review. GitHub branch/ruleset settings must make successful checks and appropriate review mandatory, with intentional handling of administrator/bot bypass. Those account settings were not changed.
- Local checks were run using the existing installed dependencies. The new workflow uses `npm ci` from the committed lockfile; its hosted result must be inspected after publication. No secrets or production credentials are supplied to it.
- No authenticated browser session, production API, live data mutation or migration was used for validation. Existing browser smoke tests still do not establish successful authenticated payroll workflows.
- Session tests use mocked authentication responses. Verify real sign-in, token refresh, logout and workspace switching in staging before release, including slow connections and mobile navigation.
- Clearing a query cache does not cancel a database write already accepted by the server. Server permissions, transaction boundaries and idempotency remain necessary.
- The root boundary catches React rendering/lifecycle failures. It does not catch every event-handler or asynchronous failure, or errors before the application bundle loads. It cannot establish whether a remote save succeeded.
- This protects the individual employee detail query; it is not a claim that every hook is now tenant-scoped. The larger tenant-provider/permission and browser-test audit remains a follow-up.
- The earlier payroll PR #2 is now reported as conflicting, while latest main already includes some changes. This follow-up starts from current main and does not merge or reapply that PR. Its database rollout/recovery/concurrency checks remain separate.

## Review and release

Review this PR independently. In staging, check sign-in/refresh/logout, company switching with the same employee route, and the recovery-screen wording. Enable required GitHub checks/reviews after checking Lovable's synced-branch setup. Check the final diff for unrelated changes before merging.

No live application deployment, database change, staff/payroll record change or email was performed. No error-free guarantee is made.
