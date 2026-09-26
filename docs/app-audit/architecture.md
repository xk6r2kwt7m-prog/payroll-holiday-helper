# Small, reviewable changes

This draft adds development checks, not a new application architecture overnight. Existing runtime behaviour, routes, payroll totals and permissions are unchanged.

## Boundaries to work towards

| Module | Owns | Must consume through an explicit contract |
| --- | --- | --- |
| Access | Identity, active workspace, role/branch scope | Employee identity, never employee pay/document payloads |
| People | Staff profile, employment lifecycle, ordinary/sensitive review | Contract terms, onboarding readiness |
| Contracts | Terms snapshots, signatures, immutable signed copies | Approved employee details and versioned rates |
| Time | Shifts, availability, time entries, marketplace | Active staff IDs and effective employment terms |
| Payroll | Imports, adjustments, approvals, export | Approved time and holiday payment results |
| Holidays | Entitlement ledger, requests, settlements, opening balances | Employee lifecycle and payroll period state |
| Learning | Assignments, lessons, server assessment, practical sign-off | Staff identity, versioned course content |
| Compliance | Document versions, evidence, RTW review | Learning results; never infer verification from upload alone |
| Delivery | Queue, provider acceptance, delivery/bounce, reminders | Event IDs and minimal recipient data |
| Reporting | Read models, filters, data freshness | Domain outputs; no corrective writes on page load |

Within a module: small presentation components → workflow hooks/adapters → pure rules and server commands. Database permissions remain the security boundary. A component split alone cannot make multi-table saves atomic or protect private data.

Start by extracting pure selectors and presentational sections without changing behaviour. Keep the old public export while migrating consumers. Never combine a broad file move, permission change and payroll calculation change in one PR. Existing financial-rule ESLint checks remain in force.

## Automated checks in this draft

`npm run check:architecture` runs eight behavioural tests and parses TypeScript/JavaScript imports with the installed TypeScript parser. It rejects:

- new hooks/library dependencies on pages or components;
- new page-to-page imports;
- new component imports into another feature folder, except `ui`, `layout`, `auth` and `common`;
- new production files exceeding 500 lines, or tracked large files growing above their recorded ceiling.

It includes static imports, re-exports, literal dynamic imports, literal `require` and import types, resolving `@/` and relative paths. Tests, declarations, data and generated integrations are excluded from these checks. Existing 65 large files and 42 dependency edges are documented in `scripts/architecture/baseline.json`; they are technical debt, not approved designs. A file shrinking below its ceiling passes. Lower its baseline after an extraction to prevent later regrowth.

These are deliberately coarse guardrails, not proof of separation or security. They do not trace transitive dependencies, computed imports, runtime calls, SQL coupling or shared hooks consumed by multiple features. A line budget does not measure correctness. Do not move application logic into an excluded folder or a shared UI folder to pass. CI cannot stop an authorised agent editing the wrong file or editing CI itself; reviewers must check scope and protect the required check on the GitHub branch if desired.

Do not automatically regenerate the baseline. A justified new cross-feature dependency needs an explicit public interface, affected-consumer list and reviewed baseline change. Prefer extracting a shared type/rule instead. A safety fix that needs a few extra lines in a large file can have a narrowly explained ceiling adjustment; never remove validation just to fit.

## Change discipline

For every draft record: problem, intended files, affected consumers, excluded workflows, before/after behaviour, failure tests and rollout/undo. Use `.github/pull_request_template.md`. Stop broad refactoring when an unrelated defect is found: add it to the queue. Do not silently change holiday policy, employment terms, reminder recipients or contract templates as part of visual improvements.

First extractions should be Payroll page → period selection / review / sharing; Employee form → ordinary details / protected details / employment terms; Contracts → draft / sign / deliver; Compliance → evidence / review / version management. Keep each extraction independently testable with no SQL change.
