# Staff onboarding and learning journey review

Reviewed from main `e3df235` on 26 September 2026. Repository review and synthetic tests only: live database policies, deployed functions, scheduler configuration, actual delivery and signed-in mobile screens have not been verified. No live records or settings changed; no messages sent.

## Intended journey

1. Manager invites a starter with the minimum identifying information and an approved role/start date.
2. Staff complete a secure phone form, resuming saved answers. Existing details should be confirmed, not requested again. Pending National Insurance applications are an explicit exception, not invented numbers. Store submissions and evidence with provenance.
3. Manager reviews differences, required information and right-to-work evidence. Bank changes require the existing direct-confirmation step. Submitted, reviewed and verified are different states.
4. Prepare one draft from the approved details and employment terms. The manager checks the actual rate, pay structure, hours, holiday basis, notice, employer identity and template version. Preparation is distinct from approval and sending.
5. Manager explicitly sends the contract. Staff verify access and sign the frozen version. An authorised manager reviews and countersigns the same version.
6. Store the completed file and attempt delivery of its secure link. Delivery failure stays visible and retry does not recreate signatures or alter the file. If a separate final-release confirmation is wanted after countersigning, it needs its own recorded state; it does not exist today.
7. Staff see one next task, an expandable plan, deadlines and their progress. Managers see outstanding staff actions separately from their own sign-off work. Training should be arranged around the work being undertaken; it need not all wait for the contract-signature process.

## What the code actually does

| Area | Evidence | Finding and disposition |
| --- | --- | --- |
| Secure staff details | `StaffDetailsPortal.tsx`, `staff-details-portal/index.ts`, allocation helpers | Resumable form, submitted-link lock, differing values held for review, NI exception path and bank confirmation machinery exist. Submission is a multi-write workflow; not certified atomic. |
| Staff approval | `useStaffDetailChanges.ts` | Updating the employee, recording the decision and writing audit evidence are separate calls. A partial failure can leave them inconsistent. Bank account and sort-code verification also need one transaction. This PR does not rewrite live records or these writes. |
| Draft readiness | `useContractAutoDraft.ts`, `contract-auto-draft.ts` | Previously ignored onboarding/document query errors, did not honour loading in the positive readiness result, and missed accepted-but-unverified bank changes. Corrected in this branch; missing/unverified RTW is no longer described as cleared. This is a preparation panel, not server-side authorisation. |
| Automatic preparation | `StaffChangesReview.tsx` | There is a manual “Prepare the contract now” action. No approval-triggered, idempotent automatic draft job was found. Do not tell staff/managers this is implemented. |
| Contract terms | `ContractFormDialog.tsx`, `contract-generation-gate.ts`, `contractClauses.ts` | Generation checks the presence of core terms; the review lists rate/hours/notice. Presence is not correctness. Holiday wording is template-generated: one branch uses 28 days including bank holidays; another describes monthly pro-rata accrual. It must be checked against each employee's actual working pattern and payroll holiday basis before automatic preparation is enabled. This PR changes no contractual wording or payroll rules. |
| Signatures and copy | `sign-contract/index.ts`, `send-signed-contract/index.ts` | Both-signature handling already attempts automatic secure-link delivery and records attempts; manual retry exists. There is no separate release state after both parties sign. Integration testing must cover final-file generation failure, missing/changed recipient and provider rejection. |
| Induction | `InductionPortal.tsx`, `InductionJourney.tsx`, induction lesson hooks | Public induction already has short sequential steps and saved progress. The signed-in lesson journey previously treated failed reads like empty data; corrected. These are separate learning stores, not one unified onboarding progress percentage. |
| Staff training | `StaffTrainingView.tsx` | Now starts with the next dated assignment, exposes the full plan on request, keeps titles readable, separates manager waiting from staff work, and reports query failures. Cancelled work was already filtered in the query; the display now defends that too. |
| Quiz outcome | `QuizTaker.tsx`, `useTrainingModules.ts` | Previously showed a result before saving, ignored attempt-insert failures and marked passed quizzes complete even if practical sign-off remained. Corrected client flow: wait for save, stop on failed attempt save, and retain remaining acknowledgement/sign-off. **Still not an authoritative assessment service:** browser receives correct answers and submits score/pass; attempt, assignment and audit writes are separate. Server-side grading, attempt enforcement and atomic completion remain required. |
| Assignment scheduling | `training_auto_rules`, `useTrainingLibrary.ts` | Role/department/location rules and `due_days_after_start` can be stored. No worker applying those rules was found in the searched application/functions/migrations. Do not treat a saved rule as delivered training. |
| Training reminders | `check-training-due/index.ts` | Existing job writes in-app notifications, not email. Corrected to include viewed work, continue periodic overdue reminders, exclude former/test staff, direct practical-sign-off reminders to managers, use London dates, scope admin-triggered runs to their tenant, check read failures and deduplicate per recipient/date. Scheduler deployment still needs checking. |
| Induction reminders | `check-induction-reminders/index.ts` | Separate, opt-in email job with 3/7/14-day then weekly cadence. Corrected tenant scoping for human runs and no longer increments the reminder counter after provider failure. Automatic initial-pack/alcohol paths still need transactional delivery/retry work before enabling them broadly. |
| Documents & Compliance | `DocumentsCompliance.tsx` | Mobile section picker, bookmarkable tabs, progressive manager sections, failed-location retry and corrected All branches selection. No document bodies, approval states or releases modified. |

## Proposed learning schedule — internal policy for manager review

This is a proposed company sequence, not a claim that every item has a statutory deadline of this duration. Use explicit manager-approved due dates, role/site applicability and the correct released version. Existing deadlines have not been changed.

| Stage | Staff-facing priority | Manager responsibility |
| --- | --- | --- |
| Before starting / before relevant duties | Essential welcome information and task-specific safety information. Make contract terms accessible. | Complete the appropriate right-to-work check; confirm role, terms and relevant safety supervision. Do not postpone critical safety information to make the screen quieter. |
| First shift | Site emergency arrangements, illness reporting, food hygiene/allergen controls relevant to the role, incident reporting; alcohol authorisation where applicable. | Site walkthrough and practical checks. A read tick alone is not proof of competence. |
| First week | Role-specific service/kitchen standards, relevant policies and assessments in short sessions. | Set real due dates, review failed attempts and arrange coaching. |
| Following week / agreed development date | Remaining non-critical handbook material and follow-up practice. | Confirm remaining practical observations and review the starter's progress. |
| Ongoing | Only changed, expired or newly assigned material. | Release versions deliberately; preserve the exact version previously completed. |

## Required backend work before describing this as fully automatic

1. **Atomic approval:** one authorised tenant-scoped transaction applies approved details and associated bank verification/audit records, with compare-and-set protection against stale submissions. Rejected changes must not silently become approved, and unrelated older requests must not block a corrected submission indefinitely.
2. **Draft job:** an approval transaction creates a unique draft request keyed by employee + approved submission/terms version. Worker re-checks the approved snapshot, creates one draft, records errors, and never sends it. Missing bank/NI administration must not obscure day-one document obligations; surface these separately from employment terms.
3. **Authoritative assessments:** return questions without correct answers; grade on the server; enforce retry limits/coaching there; commit attempt and completion evidence together. Keep reading, acknowledgement, quiz and practical sign-off as distinct requirements.
4. **Unified plan:** generate version-pinned tasks with employee, role, site, owner (staff/manager), release date, due date, prerequisite and completion evidence. Reconcile the three existing stores (pack items/modules, induction lessons, library assignments) before showing a single overall completion score.
5. **Delivery outbox:** persist per-recipient reminders and final-copy deliveries with unique event keys, retries and provider IDs. The current read-then-send deduplication is not concurrency-proof. Catch up after missed scheduler days. A sent notification is not proof of inbox delivery or reading. Paginate large scheduled scans rather than relying on default API row limits.
6. **Controlled release:** keep existing automatic-send settings unchanged until a synthetic starter rehearsal passes in staging. Deploy changed edge functions explicitly; applying frontend files alone does not update scheduled jobs.

## Rehearsal and release checks

- Staff submits incomplete details, correction to existing details, NI pending, invalid banking confirmation, evidence needing manager review and a future start date.
- Fail each source read; verify no green “ready” state and no write from merely opening a page.
- Approve, retry and race two manager approvals; prove one approved snapshot and one draft.
- Change terms after drafting; require review/reissue rather than modifying a signed file.
- Sign once as staff and once as manager; test expired links, retries, missing final PDF, failed delivery and manual retry without extra signatures.
- Assign approved site/role work with staged dates; confirm no unpublished or cancelled items, and no unnecessary repeat questions.
- Fail a quiz save, exhaust retries and require practical sign-off; do not show successful completion before stored evidence exists.
- Run reminder jobs in staging with outbound mail redirected: due today, overdue 14/21 days, former staff, cross-tenant admin, opted-out user, missed scheduler day and two simultaneous runs.
- Test phone layouts at 360/390px and keyboard navigation in an authenticated preview. Current component tests are not a substitute for this.

## Reference constraints checked

- GOV.UK: principal written statement on the first day; wider statement within two months. Information includes pay, hours, holiday and required training; day-one information also includes notice and sickness arrangements. https://www.gov.uk/employment-contracts-and-conditions/written-statement-of-employment-particulars
- GOV.UK: check right to work before employment; a share-code upload alone is not that check. British/Irish citizens use the appropriate document/identity route, not a mandatory share-code route. https://www.gov.uk/check-job-applicant-right-to-work

These sources constrain the workflow; this review does not certify the employment contract text or live compliance documents as legally sufficient.
