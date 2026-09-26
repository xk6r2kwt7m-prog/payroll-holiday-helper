# Onboarding evidence safeguards — proposed release

This draft builds on PR #12. It does not deploy code, apply SQL, send messages or change existing records.

## Corrections and affected consumers

- `useRecordRightToWorkDecision` now calls one database transaction. The database authorises the active workspace manager, locks the employee and evidence record, checks the revision reviewed, records the decision and audit together, and stores a private retry receipt. A lost response can be retried without duplicating the audit. Reusing a request for another decision fails. Direct client writes to review fields are blocked. No missing-function browser fallback exists.
- `StaffChangesReview` requires evidence notes, offers an explicit expiry date (blank means no time limit recorded), waits for current evidence and shows read failures. This records a manager's check; it does not perform a Home Office check or prove document authenticity. Existing service-role submission paths still require their own transaction review.
- Contract readiness and the review badge derive expiry against the London calendar date. A verified but expired record no longer looks ready. Malformed expiry dates require review. This does not alter the stored review, employment status, holiday balances or contract wording. Readiness is evaluated when the component renders; this is not a background expiry worker or a server contract-issue gate.
- Published/previously published/assigned quiz questions cannot be inserted, changed, deleted or moved to evade the lock. Published grading rules cannot be changed by unpublishing or clearing the publication timestamp. The manager interface makes questions read-only and disables grading controls. A separate draft module is required. No existing questions, scores or signed records are rewritten.
- The induction reminder job and browser helper share one timing rule: catch up once to the latest elapsed milestone after a missed scheduled run, then wait for the next milestone. It ignores cancelled/draft packs, expired links, former staff and test records. Missing document reads fail rather than send a misleading reminder. No reminder preference is enabled.

## Exact SQL and release order

`supabase/pending-migrations/20260926130000_onboarding_evidence_guards.sql`

1. Apply PR #12's migrations and matching frontend to staging first.
2. Compare this migration with the actual schema, function owners, grants, existing triggers and service-role portal submissions. It adds a private receipt table, one RPC and three protection triggers. No existing row is backfilled.
3. Run the synthetic database checks, then reproduce them in staging with actual roles and PostgREST. Test concurrent review/submission, request retries, publication/question-edit races, existing authoring screens and the automatic `updated_at` trigger. Review the published-module lock against any existing in-place versioning integrations.
4. Deploy the matching frontend and edge reminder function to staging. Use synthetic staff and a mail sandbox. Check the phone review form, London expiry boundary, and missed reminder milestones. The full authenticated browser/edge workflow has not been exercised here.
5. Review the exact SQL and staging evidence before approving a production migration. Frontend review actions fail closed until the RPC exists. Do not deploy it by itself.

## Validation

- Full app test suite, TypeScript check, production build and financial boundary check.
- `onboarding-evidence-transactions.mjs`: 17 in-memory PostgreSQL checks for permissions, stale revisions, audit rollback, retry receipts, explicit expiry clearing, client forgery, published question/rule locks and separate draft editing.
- Tests use minimal synthetic PGlite tables. They are not a live-schema clone or true concurrent-session tests.
- The old weekly reminder test now records the preceding reminder before expecting silence the next day; without a recorded send, catching up is the intended correction.
- The old source-text audit test now checks the server boundary. Behavioural client and database tests verify the actual transaction and rollback.

Run the database checks with:

```
PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node supabase/pending-migrations/tests/onboarding-evidence-transactions.mjs
```

## Remaining work and rollback

This is not a complete onboarding automation release. Automatic draft generation still needs approved employment terms/holiday basis and an idempotent draft transaction. Initial staff submissions, unified staged assignments and a durable notification outbox remain outstanding. Current reminder sends can still duplicate if delivery succeeds but storing the sent marker fails, or if jobs run concurrently. Catch-up timing does not solve that delivery guarantee. Existing automatic induction/alcohol creation remains a separate, non-transactional path and must be reviewed before expanding automation.

The question/rule lock preserves the assessment, not a full immutable snapshot of lesson content or an automatic new-version builder. Existing completed evidence remains untouched; manager-led reassignment of a separate module is still required.

Do not roll back by restoring direct browser review writes or silently unlocking completed assessment history. Keep the receipt/evidence data, suspend affected operations if necessary, and use a reviewed forward fix. Earlier frontend versions cannot use the protected direct-write review path.
