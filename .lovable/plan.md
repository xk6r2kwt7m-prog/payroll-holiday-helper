# Findings: "1 could not be sent" on the staff details request

Investigation only. No files or data were changed.

## 1. What failed (06:39 UTC today)

- One request was sent from the profile of employee `898f680e…`, to **barros.aderito@hotmail.com**. It was an "existing staff update" asking for 8 items (phone, address, passport, share code, emergency contact, date of birth, legal name, visa). The sender was recorded as "Aderito test Barros". It was not a test send.
- `send-info-request` **succeeded (200)**. It checked permission, created the request and link, and closed any older open link.
- It then passed the email to `send-notification`, which **refused it with 401 (not signed in)** after 596 ms. No email went out.
- The failure is filed in the audit log as `employee_info_request_send_failed`. The error saved there is "Edge Function returned a non-2xx status code".
- The function logs only show start-up and shutdown lines. There is no error text in them, because `send-notification` stops at its sign-in check before it writes any log line.

## 2. Cause in plain English

The details request itself was fine. The step that sends the email refused a call from our own system.

- `send-info-request` hands the email on using the system's internal key (`admin.functions.invoke`, line 319).
- `send-notification` now checks every caller with `guardRequest` (lines 577–582). This check was added in the recent security hardening.
- A 401 from that check comes from `_shared/auth-guard.ts`, line 82 ("no key sent"), 85, 90 or 99. The internal key should match at line 84 and be allowed through. Getting a 401 means the key that arrived was either missing or not recognised as the internal key.
- Not yet confirmed: which of those lines fired. A likely cause is that the internal call does not put the key where the check looks for it. The logs can't prove this, because nothing is logged before the check.
- Ruled out: a missing email address (one was on record), the manager's own permission (passed with 200), the provider (never reached), and the recipient allow-list (it runs after the sign-in check).
- Side effect: a request row now exists but was never emailed. Any earlier open link for this person was closed and replaced by it.

## 3. Is the real reason hidden?

Yes, partly.
- When a function answers with an error, the app library replaces its reply with the fixed text "Edge Function returned a non-2xx status code". `send-info-request` saves that text as `mailErr.message` (line 341), without reading the real reply from `send-notification` (which was "Sign-in required").
- The app then shows it through `useSendInfoRequest` in `src/hooks/useInfoRequests.ts` (line 125) as "1 could not be sent: …".
- The same pattern is used for reminders (line 172) and "Send now" on prepared requests (line 102), so those buttons would fail in the same way.

## 4. Sandbox and test records

- **Sandbox workspaces:** found in Platform Admin > Sandbox tab (`src/pages/PlatformAdmin.tsx`, `src/hooks/useSandbox.ts`). This is for platform administrators only. It creates separate demo companies with sample staff. "Reset" deletes the operational data of the chosen sandbox company (staff-related tables, company settings, locations, departments, payroll periods, vacancies) and logs `sandbox_reset`. It works on whichever company it is given, so it should only ever be used on a sandbox company, never on UD.
- **Test staff records:** each staff record has an `is_test_record` flag. It is switched on by creating the test staff member from the test card on the Contracts page (`TestStaffCard.tsx`, `buildTestEmployeeInsert`). As a fallback, the name "Aderito test Barros" is also treated as a test record. Test records are left out of payroll import, minimum wage checks, missing information, alcohol/DPS lists, training automation and the allergen pilot. The card can hard-delete only records that have this flag.
- **Contract test mode:** `src/lib/contract-test-mode.ts` adds "[TEST]" to the subject of rehearsal emails. The details request has its own `testSend` option, which does the same.

## Suggested next step (needs your approval, not done)

1. Record what `send-notification` actually receives and which guard line refuses it.
2. Then fix the internal handover, and pass the real refusal reason through to the manager instead of the generic text.
