# Fix contract email delivery reporting

## Outcome
Contract emails will no longer be shown as delivered merely because the email service accepted them. Management will see whether the latest message was delivered, is still processing, or was rejected, including a clear reason and a manual retry path.

## Changes
- Keep every contract send manual and individually confirmed.
- Change immediate success wording from “sent” to “accepted for delivery”.
- Add a management-only delivery check that reads the email provider’s delivery event for the latest contract invitation.
- Show delivered, processing, or rejected status on the contract screen; rejected mail will show the provider’s reason.
- Preserve signed files, signing links, contract wording, staff records, historical records, and all existing assignments/certificates.
- Do not resend any email during implementation or testing.

## Technical details
- Add an authenticated server function that verifies company access, finds the latest audited provider message for the selected contract, and checks its delivery events without exposing provider credentials.
- Treat provider acceptance and recipient-mailbox delivery as separate states.
- Add focused tests for the status mapping and UI wording, then deploy only the new delivery-check function.
