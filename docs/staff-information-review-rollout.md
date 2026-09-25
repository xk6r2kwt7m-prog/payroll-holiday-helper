# Staff information review improvements

Prepared against main commit `b0ca8b2e4ff97146d67e4fb323a6882a844607c9`.
This branch has not been deployed and its migration has not been applied.

## Behaviour

- NI entry is masked and requires matching confirmation, validated again by the
  submission service. Confirmations are excluded from saved drafts and final
  stored answers. NI numbers join bank details in administrator review.
- Staff can report that an NI application is pending without inventing a number.
  The manager can see that status and the optional application date.
- Pending reviews suppress repeat information requests without counting as
  accepted identity or bank details. Review decisions refresh those screens.
- Student permission collects course details, term/vacation dates and work
  restrictions. A positive check recorded by a manager requires course evidence.
- Staff unable to provide documents or a share code can request help. Managers
  can record a pending Employer Checking Service case; this does not clear the
  employee for work. The form links to the official checking services.
- Check-loading errors are exposed instead of silently substituting legacy
  clearance. The onboarding approval control stays disabled while checks are
  loading or unavailable.
- The proposed database migration requires completed checks to reference evidence
  belonging to the same employee and workspace and enforces manager scope.

The app records evidence and decisions. It does not automatically query the
Home Office or validate a person's entitlement, an NI number's ownership, or a
bank account's ownership. Matching entries only help catch typing errors.

## Deployment order — approval required before the database step

1. Review `drizzle/migrations/0037_staff_review_integrity.sql`. It adds three
   check-history columns, expands method/result values, and installs ownership
   and evidence validation for future inserts. Existing checks are not backfilled.
2. Rehearse on a staging database with the actual schema and policies. The
   automated database test uses a minimal synthetic fixture, not a production
   database clone. Include manager scope, evidence access and mobile submission.
3. Once the exact SQL is approved, apply migration 0037 through the project's
   migration workflow. Confirm migration 0036 is already present.
4. Deploy the `staff-details-portal` edge function and frontend together. The new
   edge function requires NI confirmation from the new frontend. Avoid leaving
   older open forms using the new service without a reload.
5. Regenerate Supabase types from the resulting database and check the diff. The
   checked-in type additions describe the proposed columns, not a live export.
6. Smoke-test a synthetic employee: saved draft, NI mismatch, NI pending, bank
   review, accepting/rejecting details, student check, pending ECS and failed
   check loading. Do not send requests to real employees for this test.

Do not deploy the frontend first: its new columns require migration 0037. If
rolling back the frontend/edge function, leave the additive migration in place
pending review; avoid deleting history or evidence.

## Verification

- `npm test`: 1,734 passed, 1 failed. The same auth-guard source-pattern test
  fails on the unchanged base commit (`phase-personal-data-protection.test.ts`).
- `npm run test:staff-database`: passes with PGlite 0.5.8 and the authenticated
  database role. Covers evidence, tenant ownership, checker identity, future
  dates, student requirements, ECS pending and permission expiry ordering.
- `npm run build`: passes, with the existing large-bundle warning.
- `npx tsc --noEmit -p tsconfig.app.json`: reports the existing
  `payroll-timesheet-csv.ts:84` error (`replace` on `never`), reproduced on base.

Historical onboarding JSON is not scrubbed by this change. Other legacy
onboarding and approval paths remain; this is not a complete security or legal
compliance certification. Staff submission still consists of multiple writes;
making submission transactional and retry-safe is a separate follow-up.

Official workflow references checked during implementation:
- https://www.gov.uk/view-right-to-work
- https://www.gov.uk/employee-immigration-employment-status
- https://www.gov.uk/check-job-applicant-right-to-work
