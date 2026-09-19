# Secure staff-information collection — version 1

Built on the portal and contract workflow that already exist. No second portal, no duplicate staff records, nothing sent to real staff, nothing published.

## What staff will see

One secure personal link, one page, phone-first:

1. Opening screen naming Ugly Dumpling, why the details are needed, and how long the link lasts.
2. Short screens, one idea each, asking only for what you ticked.
3. Answers save as they type, so they can close the page and come back.
4. A check screen, then submit.
5. If the link is tied to a contract, they carry straight on to read and sign it — without being asked anything twice.
6. After submitting, the link becomes read-only and simply confirms receipt.

Information the page can ask for: full legal name, preferred name (optional), date of birth, personal email, home address, National Insurance number with an "I do not have one yet" option, account-holder name, sort code, account number, emergency contact (optional), and right-to-work status with the document or share code. Telephone number appears only when you tick it.

The pay section carries this line, word for word:

> Ugly Dumpling will never ask for your online-banking password, PIN, card security code or verification code.

## What you will see as manager

A request builder with four ready choices plus a correction option: New starter details, Payroll details, Right-to-work information, Emergency contact, Correct existing information. Each is a set of ticks you can change.

Before anything can be sent: a confirmation screen showing the staff member, exactly what is being asked for, when the link expires, and the email as they will receive it. Sending needs a second, explicit confirmation.

## Reviewing what comes back

- Blank fields on the staff record can be filled straight from a submission.
- These always wait for your review: a change to an existing legal name, date of birth, NI number or email; any new or changed bank details; any right-to-work document.
- The review screen shows the value on file beside the submitted value. Bank and NI values are masked unless you are an administrator.
- Every acceptance or rejection records who did it and when.
- Changed bank details stay pending and are not used for pay until an administrator ticks that they confirmed the change directly with the employee. The tick is recorded with name and date.

## Right to work

Each submission carries a status: Requested, Submitted, Verified, Rejected, Expired. Who checked the evidence and when is recorded. Unverified right to work shows as a warning on the staff record and the readiness list. Nothing is cancelled automatically — no contract is voided and no shift is removed.

## Security fixes included

- Branch access enforced in the database, not only on screen: a branch manager can read only staff at their own branches, for staff records, details requests and documents. Rotas, timesheets and payroll keep their current behaviour and follow later.
- Bank details, National Insurance numbers and identity documents become administrator-only. Managers and supervisors no longer receive those values at all — not even masked ends — because the database stops returning them.
- The document access log can no longer have entries added by ordinary users; only the system writes to it.
- The prompts suggesting managers share signing links over WhatsApp are removed from the contract screens. WhatsApp stays fine for questions; the secure link is the normal route for anything sensitive.

## Contract connection

"Ask for details first" stays the default. Missing required details are collected before the contract appears, then the same session continues into the contract with nothing re-asked. Staff can change their own personal details only — pay, hours, role, branch, start date and any other contractual term are not editable by them. The existing employee-signature and employer-countersignature steps are untouched.

## Testing before I stop

Run as test data only: new starter completing everything on a phone; existing employee filling gaps; a bank-detail change; a right-to-work submission and review; an expired link and a revoked link; a branch manager reaching for another branch's staff; an unauthorised user reaching for bank or NI data; details followed by contract signing; employee signature followed by employer countersignature.

## Technical notes

Database (additive only, no drops, no data migration):
- `employee_info_requests` gains `requires_review`, `reviewed_by`, `reviewed_at`, `review_decision`, `review_notes` where not already present, plus a `preset` value for the correction request.
- New `staff_detail_changes` table: one row per submitted field — `tenant_id`, `employee_id`, `request_id`, `field_name`, `old_value`, `new_value`, `state` (pending / accepted / rejected), `decided_by`, `decided_at`, `notes`. Grants for `authenticated` and `service_role`; RLS restricting reads to administrators, with bank and NI rows readable by administrators only.
- New `bank_detail_verifications` table: `tenant_id`, `employee_id`, `change_id`, `verified_by`, `verified_by_name`, `verified_at`. Bank changes apply to `employees.bank_account_no` / `sort_code` only after a row exists.
- `employee_onboarding_data.rtw_status` gains the five-state check (`requested`, `submitted`, `verified`, `rejected`, `expired`) alongside existing values, with `rtw_reviewed_by` / `rtw_reviewed_at` already present.
- `employees` SELECT policy replaced: administrators see all; other tenant members see only employees sharing a branch via `employee_branches`, through a new `can_view_employee(uuid)` security-definer helper. Same helper gates `employee_documents`, `employee_info_requests`, `employee_onboarding_data`.
- Sensitive columns (`ni_number`, `bank_account_no`, `sort_code`, `passport_no`, `sharing_code`, `residence_permit`) have column-level SELECT revoked from `authenticated`; administrator screens read them through a security-definer function `employee_sensitive_fields(uuid)` that returns nothing unless the caller is a company admin. Every current reader of those columns (about 30 files, mostly payroll and onboarding readiness) is repointed at that function or at a boolean "is on file" flag, so no screen silently empties.
- `document_audit_log` INSERT policy dropped for `authenticated`; writes move to the existing edge functions under `service_role`.

Application:
- `src/pages/StaffDetailsPortal.tsx` extended: autosave on change, resume, read-only confirmed state, the payroll warning line, "I do not have one yet" for NI, and hand-off into `SignContract` in the same session.
- `src/lib/info-request-items.ts`: presets reshaped to the five manager choices; `phone` only when ticked.
- `src/hooks/useInfoRequests.ts` + a new confirm-before-send dialog in `InviteEmployeeDialog` / the request builder.
- `src/components/employees/SubmittedDetailsReview.tsx` extended into the side-by-side review with masking, accept/reject recording, and the bank verification tick.
- WhatsApp copy removed from `ContractFormDialog.tsx:1710` and `ContractSigningActions.tsx:1276`.
- `staff-details-portal` edge function handles autosave, read-only-after-submit, expiry and revocation.
- Tests in `src/test/` covering every case in the testing list, all against test records.

## Still needing your approval afterwards

Sending any request to a real member of staff, publishing, and any historical data tidy-up. None of those happen in this version.
