# Email delivery investigation report

No files, secrets, data, or emails were changed.

## 1. Email-related project secrets

The configured secret names are:

- `EMAIL_PROVIDER`
- `POSTMARK_ACCOUNT_TOKEN`
- `POSTMARK_SERVER_TOKEN`
- `RESEND_API_KEY`

There are no configured SMTP, SendGrid, or Mailgun secrets. The secret listing does not expose update timestamps, so the exact replacement time cannot be independently read. The secure update earlier in this session did replace `POSTMARK_SERVER_TOKEN` within the last hour, but the available secret metadata cannot timestamp it.

## 2. What the email functions read

`send-notification` reads:

- Provider choice: `EMAIL_PROVIDER`
- Postmark server token: `POSTMARK_SERVER_TOKEN`
- Resend fallback token: `RESEND_API_KEY`
- Sender: hardcoded as `UglyOps HR <support@uglyops.com>`; it does not read a sender environment variable
- Postmark stream: hardcoded as `outbound`; it does not read a stream environment variable

Other direct email senders:

- `send-payroll-email` independently reads `EMAIL_PROVIDER`, `POSTMARK_SERVER_TOKEN`, and `RESEND_API_KEY`; it uses the same hardcoded sender and `outbound` stream.
- `send-licensing-document` independently reads `POSTMARK_SERVER_TOKEN`; it uses the same hardcoded sender and `outbound` stream.
- `check-contract-email-delivery` reads `POSTMARK_SERVER_TOKEN` only to check delivery events; it does not send.
- Other staff-information, contract, induction, and compliance functions hand email to `send-notification` rather than using another provider key.

## 3. Deployed key comparison

The Postmark key currently available in the investigation environment:

- Is not the special `POSTMARK_API_TEST` token.
- Successfully opens the Live server named `UGLO HR Platform`.

The deployed `send-notification` function cannot reveal its secret value, and it was not printed or retrieved. Its observed behaviour shows that it is using a different Postmark server context from the currently available Live key:

- At 09:40:52 UTC it returned message ID `1804bfd9-cdbc-4ecc-9b03-dc6b733582c1` and logged the send as accepted.
- The Live server says that message ID does not exist.
- The two earlier returned IDs also do not exist on the Live server.

Therefore the deployed key is **different in effect** from the available Live server key. The evidence does not prove whether the deployed value is specifically `POSTMARK_API_TEST`, a sandbox-server token, or another server token.

## 4. Live server activity today

The Live `UGLO HR Platform` server has **zero outbound messages since midnight UTC today**.

There are therefore no times, subjects, statuses, or recipient domains to list. This confirms that the app's recent sends are not reaching this Live server.

## 5. Latest sender logs

Latest `send-notification` event:

- 09:40:52 UTC
- Template: staff information request
- Provider: Postmark
- Result logged: sent/accepted
- Message ID: `1804bfd9-cdbc-4ecc-9b03-dc6b733582c1`
- Provider error: none

That message ID is absent from the Live server. No recent `send-notification` error or rejection log was found.

## 6. From-domain confirmation

The configured sender is `support@uglyops.com`. The available account credential returned 401 for Postmark's sender-signature and domain-verification endpoints, so current DKIM and Return-Path verification could not be independently confirmed through read-only API access.

The Live server previously accepted mail from this sender, but that historical fact is not a current verification check.

## Conclusion

Emails are **not reaching Postmark's Live `UGLO HR Platform` server**.

The single most likely reason is that the deployed `send-notification` function is still bound to an older or different `POSTMARK_SERVER_TOKEN`, despite the investigation environment seeing the correct Live key.

The exact correction is to redeploy `send-notification` after confirming the project secret named `POSTMARK_SERVER_TOKEN` contains the Server API Token from the Live `UGLO HR Platform` server. No code change is required. Afterward, one explicitly approved test email would be needed to verify that its message ID appears on the Live server.
