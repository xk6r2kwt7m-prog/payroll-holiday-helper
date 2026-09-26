# Atomic onboarding safeguards — proposed release

This branch follows PR #11. It prepares two database migrations plus their matching client calls. Neither migration has been applied. Do not deploy the frontend alone: staff approvals and assessments deliberately fail closed when the functions are missing.

## Corrected here

- Staff-detail acceptance writes the employee value, decision and audit in one transaction. The server uses the stored submission, checks an explicit field whitelist and refuses stale values. Identical decisions are safe retries; conflicting decisions are refused.
- Banking confirmation locks the employee and selected changes in a consistent order, restricts the action to an active company administrator, validates both fields, and writes both verifications and audit together. Client writes to approval and verification tables are revoked. Audits record the action without copying banking secrets.
- Staff assessments load questions without the answer key. Grading, attempt limits, version checks, completion gates, attempt storage and audit all run in one database transaction. A private retry receipt prevents an identical request from consuming another attempt. The client no longer submits a score or pass flag.
- Staff cannot directly manufacture quiz scores or practical sign-off. Question authoring remains manager-controlled; attempt-history reads are scoped to the employee or manager. A completed quiz cannot bypass outstanding acknowledgement or practical sign-off.

## Migration review files

1. `supabase/pending-migrations/20260926110000_atomic_staff_approvals.sql`
2. `supabase/pending-migrations/20260926120000_server_training_assessments.sql`

Both contain explicit transactions. They add functions, one private receipt table, policies and a trigger; revoke client write privileges on approval/verification/assessment evidence; and do not backfill employee data, previous quiz outcomes or existing signatures.

## Validation and important limits

Transaction scripts run in an in-memory PGlite PostgreSQL engine with a minimal synthetic schema. They verify rollback after injected audit/verification failures, authorisation, stale values, replay, hidden answer keys, grading and attempt limits. They do not reproduce every deployed trigger, grant, column type, policy or concurrent PostgREST session. The real staging schema must still be compared before application. Test multi-session races in staging; the synthetic engine serialises calls.

Run (PGlite installed outside the app, so no dependency/lockfile change is required):

```
PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node supabase/pending-migrations/tests/staff-approval-transactions.mjs
PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node supabase/pending-migrations/tests/server-assessment-transactions.mjs
```

## Release order

1. Bring PR #11's fixes into the staging codebase first.
2. Compare each referenced table, column, RLS policy, grant and function owner with the deployed schema; account for platform-owned module authoring permissions.
3. Apply these exact reviewed migrations to staging. Test staff/admin roles, failed transactions, accepted legacy bank changes, changed module versions, multi-session retries and existing manager assessment/sign-off screens.
4. Deploy the corresponding frontend to staging and rehearse a synthetic starter. No actual email recipients are required for these changes.
5. Review the exact SQL and staging evidence before approving any production migration. Deploy the matching frontend in the same release window.
6. Roll back frontend only with caution: the old direct-write paths have intentionally lost database privileges. Do not restore broad grants or expose answer keys merely to make older code run. Prefer a forward fix or suspend the affected operation.

## Remaining gaps — not silently declared resolved

- Right-to-work decision recording and the initial staff submission still use their existing writes. They need their own transaction and evidence review; uploaded documents do not constitute a completed right-to-work check.
- Automatically preparing a contract from an approved snapshot needs an idempotent job and an agreed holiday basis/template for each working pattern. No automatic draft worker, holiday wording or statutory calculation was changed here.
- Unified staged learning assignments and durable notification delivery remain a subsequent backend release. Existing schedules and automatic-send preferences remain unchanged.
- Published question version integrity must also be enforced during authoring: this submission path refuses a version mismatch but does not introduce immutable question snapshots. A manager must not edit a published quiz in place without versioning it.
- These functions use the configured general-module pass mark and retry limit. They do not replace the separate allergen programme's critical-question/coaching rules.
