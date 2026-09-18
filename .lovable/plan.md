# Contract emails: ask only for what's missing, never disclose stored data

## Principle

When we email someone about their contract (signing link, verification code, completion), the email must:

1. **Only ask for information the system does not already have.** If we hold Maria's home address, we never ask her for it again.
2. **Never repeat stored personal details back in an email.** Emails can be forwarded, intercepted or sent to a shared inbox — so no addresses, NI numbers, bank details, dates of birth or phone numbers ever appear in an email body. Held details are only ever shown behind the secure, single-use signing link.

## Current state (verified)

- The signing page already asks only for missing fields: anything on file (name, date of birth, address, phone, NI, emergency contact) is shown as "Already on file" for the person to check, and if nothing is missing the details step is skipped entirely.
- Contract emails (`contract_signing`, `contract_signature_received`, `contract_fully_signed`, employer notifications) currently contain only the person's name and a secure link — no stored personal data is echoed.
- The email-verification code email contains only the 6-digit code and expiry.

## What this plan adds

1. **A documented, enforced rule** rather than incidental behaviour:
   - A single shared "email content" checklist in the notification templates: contract emails may contain first name, contract reference and secure links only — never address, NI, bank, DOB, phone, or emergency contact details.
2. **Details step copy made explicit**: the signing page states plainly "We only ask for details we don't already hold. We never send your personal details by email."
3. **Tests** asserting that every contract email template contains no personal-data fields (address, NI, bank, DOB, phone) and that the details step requests only fields flagged as missing by the server.
4. **No changes to**: any existing signed contract, record status, delivery behaviour, or the manual-first email policy. Nothing is sent to staff.

## Technical notes

- Files touched: `supabase/functions/send-notification/index.ts` (template review/comment guard), `src/pages/SignContract.tsx` (copy line only), new test file under `src/test/`.
- No database migration required. No edge-function behaviour change.
