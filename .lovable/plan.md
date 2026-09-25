# Why "Send Test Email" failed, and the fix

No files, secrets or data were changed, and no email was sent.

## Findings

1. **What the button calls:** `send-notification`, with the body `{ to: <typed address>, subject: "UglyOps HR Platform – Email Test", type: "test", data: {} }` (`useNotifications.sendTestEmail`, lines 83–90). It sends **no company (tenant_id)**.
2. **Logs:** `send-notification` started at 09:57:55–56 UTC (10:57 UK time). There was no `[auth-guard]` 401 line and no `[EMAIL_SEND]` line, so the request never reached Postmark and there is no Postmark error. The request logs don't show the status code, so the cause below is worked out from the code and your account's records rather than read from a log.
3. **Live server:** 0 emails, 0 bounces today. The hotmail address is **not** suppressed on `outbound`.
4. **Cause:** your account is an administrator in **two** companies. When a request names no company, the sign-in check (`_shared/auth-guard.ts`) refuses it with **400 "Company must be specified"** before anything is sent. That refusal writes no log line, which matches the logs. The app then replaces the real reason with the generic "Edge Function returned a non-2xx status code".

## Fix (needs approval, code change only)

- In `src/hooks/useNotifications.ts`, `sendTestEmail` passes the current company's `tenant_id` in the body.
- In the same function, read the function's real reply so the screen shows the actual reason (for example "Company must be specified") instead of the generic text.
- Optional: log a one-line reason when the check refuses a request with 400 or 403, as 401s already do.

Then, with your approval, press Send Test Email once and check its message ID on the Live server.
