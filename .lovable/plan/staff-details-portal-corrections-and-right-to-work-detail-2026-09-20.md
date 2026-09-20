# Staff details portal — corrections and right-to-work detail

Seven changes to the existing secure details page, the emails and the manager review. No new portal, no historical data touched, nothing sent to anyone.

## 1. "Do not reply" — stop the contradiction

The contract email currently says "just reply to this email" while the footer says the opposite. The reply line is removed from every staff email and replaced with:

> Please do not reply to this email — it is not monitored. If you have a question, speak to your manager.

The footer keeps the same message, so the two never disagree. Applies to the contract-signing email, the details-request email and the signature/completion emails.

## 2. Hide the sort code and account number while typing

On the pay screens the sort code and account number are masked as they are typed (dots, with a small "show" eye if they want to check). The re-enter box stays masked too, and the comparison still happens, so a typing mistake is still caught. The reminder line stays exactly as it is:

> Ugly Dumpling will never ask for your online-banking password, PIN, card security code or verification code.

## 3. Email address shown partly, not editable

Where we already hold an email, the screen shows it partly hidden (for example `re••••••@gmail.com`) and it cannot be changed, with the line:

> This is the email we hold for you. If it is wrong, please speak to your manager before continuing — we cannot change it here.

If we hold no email at all, they can type one as they do now.

## 4. Right to work — expiry only where it applies

They first choose their right-to-work basis from a short list:

- British or Irish citizen
- Settled or pre-settled status (EU Settlement Scheme)
- Visa or immigration permission
- Other / not sure

British and Irish citizens and people with settled status are not asked for an expiry date — there is nothing that expires. Everyone else must give the expiry date of their permission. Pre-settled status asks for the expiry date, because it does run out.

When they upload or photograph a document, they must first say what it is, from a list:

Passport · National identity card · Birth certificate (with proof of National Insurance number) · Biometric residence permit · Biometric residence card · Visa or entry clearance · Share code confirmation · Certificate of naturalisation or registration · Right-of-abode certificate · Immigration status document · Other (they describe it)

The document type and expiry are recorded against the file, so the existing expiry reminders work from real data rather than a guess. Right-to-work status still runs Requested → Submitted → Verified / Rejected / Expired, still records who checked it and when, and nothing is ever cancelled automatically.

## 5. Contract produced automatically once you approve

When the last outstanding item on a person's record is approved — no pending detail changes, bank change verified where there was one, right to work verified — the system prepares their contract **draft** automatically, filled from the approved details, and tells you it is ready for your review.

It does not send anything. It does not sign anything. You still open it, check it and press send yourself, exactly as now. If anything required is still missing, no draft is produced and the record says what is outstanding.

## 6. Walk the new starter through end to end

Run the full journey on a phone-sized screen as test data: open the link, answer every screen, leave and return mid-way, submit, see the read-only receipt, continue to the contract. Then confirm on screen that the expiry date shown to the staff member, the expiry stored on the request and the expiry printed in the email are the same date, and that the email text matches what you were shown before sending, word for word. Findings reported back with screenshots; no real staff member involved.

## What does not change

Sensitive-field protection, bank verification before pay, manager review of name / date of birth / NI / email / bank changes, branch restrictions, the employee-signature and employer-countersignature steps, and the rule that nothing is emailed without your specific approval.

## Technical notes

- `supabase/functions/send-notification/index.ts`: drop the "just reply" line from `contract_signing`, add the same do-not-reply sentence to `info_request`, `contract_signing`, and the signature/completion templates; redeploy.
- `src/pages/StaffDetailsPortal.tsx`: masked inputs for `sort_code` / `account_number` / their confirm boxes; a read-only masked email step when `employees.email` is held; `rtw_basis` question driving whether `expires_at` is required; a required `document_type` select on the upload step.
- `src/lib/info-request-items.ts` and `supabase/functions/_shared/info-request-items.ts`: add the RTW basis and document-type lists in one shared place so page and server agree; presets unchanged.
- `supabase/functions/staff-details-portal/index.ts`: accept and store `rtw_basis`, `document_type`, validate expiry required unless basis is British/Irish or settled; store document type on `employee_documents`; redeploy.
- New readiness helper (extending `contract-generation-gate.ts`) + a hook that, after a decision in `useStaffDetailChanges` / `useRightToWorkReview`, creates the contract draft via the existing draft path (`contract-draft-from-employee.ts`) with `contract_send_status` left unsent; audit entry recorded.
- Tests: masked bank entry, non-editable held email, expiry required/not-required per basis, document type required before upload, draft created only when everything is approved and never sent, email template contains no reply invitation and matches the previewed expiry.
