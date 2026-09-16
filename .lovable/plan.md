# Safe end-to-end contract testing with your own email

Goal: let you run the complete contract journey — receive the email, fill in details, sign, upload, review, countersign, get the final copy — using your own inbox, without any real staff member receiving anything and without polluting their record.

## How it will work

**1. "Send to me instead (test run)" switch in the send box**

Wherever you press Send contract, Send reminder or Send signed copy, the confirmation box gains a switch:

- Off (default): sends to the staff member as today.
- On: sends to your own account email, pre-filled and editable.

When the test switch is on:
- The email subject is prefixed `[TEST]` so it is obvious in your inbox.
- The staff member's record is not marked as "sent" — their real send status, sent date and recipient stay untouched.
- The action is written to the audit trail as a test send (who ran it, when, which contract, which address), so nothing is hidden.
- The signing link works normally, so you can complete the whole flow from your phone.

**2. A clearly marked test staff member**

A one-tap "Create test staff member" action on the Contracts page creates an employee named `ZZ Test Staff (do not pay)` with your email, marked as a test record:

- Excluded from payroll periods, payroll imports, holiday accrual and reporting, so no payroll, holiday or minimum-wage figure changes.
- Shown with a Test badge everywhere it appears.
- Deletable in one click when you have finished testing.

This is the record to use for full rehearsals: build a contract for it, receive it in your inbox, submit the details form, sign, upload a signed copy, then review, countersign and resend the final copy.

**3. Test contracts labelled end to end**

Contracts belonging to a test staff member (or created by a test send) show a Test chip on the row and in the review area, and are filtered out of the contract counts used for readiness and compliance.

## Safety rules kept

- No change to payroll, holiday, minimum wage or service charge logic.
- No silent edits to real staff records — a test send never writes to the staff member's email, send status or documents.
- Every test send and test record creation is audit logged.
- Signed and completed contracts stay locked.

## Technical notes

- `useSendContractEmail` gains `testMode` and `testRecipient`; in test mode it skips the `employee_documents` send-status update and logs `contract_email_test_send` to `audit_log`.
- Send confirmation UI in `ContractSigningActions.tsx` and `ContractFormDialog.tsx` gains the switch, defaulting off, pre-filling the signed-in user's email.
- New `is_test_record` boolean on `employees` (default false) via migration; period-relevance, payroll import scope and holiday/report queries exclude it.
- `SignedContractsList.tsx` and the review tab render the Test chip.
- Tests: test send does not mutate document send status, test send logs audit, test employees are excluded from payroll/holiday scope, switch defaults off.
