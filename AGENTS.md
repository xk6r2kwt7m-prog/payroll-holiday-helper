# Safe changes to UglyOps

## Scope and collaboration
- Read the current branch and relevant implementation before editing. Preserve newer user/Lovable work.
- Keep each change tied to the user's requested outcome. Do not redesign other screens, change shared styles or perform unrelated clean-ups.
- Identify the intended files and affected consumers before changing a shared hook, component, permission rule or database function. Include this impact in the PR.
- Report additional findings separately. Expand the implementation only when necessary for the authorised task; explain why.
- Work on a review branch. Do not merge, publish, apply live migrations, send messages or change live records unless explicitly authorised for that action.

## Data and business rules
- Viewing a page must not mutate business records.
- Scope protected queries AND cache keys to the active workspace; disable reads until identity/workspace is resolved. Database authorisation remains mandatory.
- Do not treat failed reads as empty successful results when approving, paying or exporting.
- Preserve signed documents, historical payroll, holiday entitlement and audit evidence. Never invent or silently repair opening balances.
- Financial multi-table operations need a server transaction and a defined retry strategy. Do not replace a missing RPC with partial browser writes.
- Keep pending migration proposals outside the automatic migration directory until reviewed. A code branch is not a test database.

## Verification and delivery
- Add behavioural regression tests for corrected failure cases, especially stale asynchronous responses, tenant changes, retries and partial failure.
- Run `npm run typecheck`, `npm test` and `npm run build` before presenting application changes as ready. Explain any failing or unrun checks.
- Do not delete, skip or weaken tests to obtain a green result. Replace brittle source-text checks with tests of the intended behaviour where practical.
- Use synthetic data for tests. Never commit credentials, real staff details, authentication browser state or database exports.
- Browser checks without a successful authenticated workflow are smoke checks, not proof that payroll or staff workflows work.
- Report prepared, tested and deployed changes separately. Include remaining limitations and rollback implications. Do not claim the app is error-free.
