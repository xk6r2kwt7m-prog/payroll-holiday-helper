# Send the payroll PDF by email, always copied to you

Today the Send button emails a secure download link and you have to be added as a recipient by hand. This changes it so the payroll PDF you already produce is attached to the email, you are always copied in, and the wording arrives pre-written so you only edit it if you want to.

## What changes

**The PDF is attached.** The same payroll PDF you generate on screen is attached to the message, so the recipient opens it straight from their inbox. A copy is still filed in the system against that pay period for the audit trail, but the email itself no longer relies on a download link.

**You are always copied in.** Every payroll email is copied to `barros.aderito@hotmail.com`. This is shown in the window as a fixed line ("Always copied: barros.aderito@hotmail.com") and cannot be removed or left off by accident — it is applied when the message is sent, not just in the form. If you ever want it changed, that is a one-line change and I will not alter it on my own.

**A ready-written draft.** Opening the window fills in the subject and the full message for that pay period, for example:

```text
Subject: Payroll — September 2026 (Ugly Dumpling)

Hello,

Please find attached the payroll report for September 2026.

It covers 37 people, 1,842.50 hours and a total of £24,318.40.
Pay date: 24 September 2026.

This is a confidential document. Please do not forward it.

Aderito Barros
Ugly Dumpling
```

You can edit every word of it, or clear it and write your own. A "Reset to the standard wording" link puts the draft back.

**See exactly what goes out.** Before sending, a preview shows the recipient, the copied-in address, the subject, the message as it will appear, and the name and size of the attached PDF. Nothing sends until you press Send.

**Nothing else changes.** Bank details stay off unless you switch them on, internal notes and adjustments stay out of the file, only administrators can send, and no email goes to anyone automatically.

## Two points to be aware of

- An attached payroll PDF sits permanently in the recipient's mailbox, where a link would have expired. That is the trade-off you chose; the confidentiality line stays in the message.
- Email providers reject very large attachments. If a payroll PDF ever exceeds about 8 MB, the window will say so and offer the secure link instead of failing silently.

## Technical notes

- `supabase/functions/send-payroll-email/index.ts`: accept `cc: string[]`, `attachPdf: boolean` and an optional reply-to; keep uploading the PDF to `payroll-files` for the audit record but stop putting the signed URL in the body when attaching. Add the attachment to both provider paths — Postmark `Attachments: [{ Name, Content, ContentType }]`, Resend `attachments: [{ filename, content }]`. Enforce the CC server-side: merge the constant `PAYROLL_ALWAYS_CC` into every send regardless of the request body, and de-duplicate against the recipient list. Reject a base64 payload over the size ceiling with a clear 400. Record `cc`, `attached` and per-recipient results in the existing `audit_log` row.
- `src/components/payroll/SendPayrollEmailDialog.tsx`: add a read-only always-CC row, a richer default subject/message built from the period name, headcount, total hours, grand total and pay date, a "Reset to the standard wording" action, and a preview block rendered from the exact values being posted. Pass `cc`, `attachPdf` and `fileName` through `functions.invoke`. Keep the existing bank-details toggle, starter/leaver logic and report config untouched.
- Deploy the edge function after the change.
- New test `src/test/phase-payroll-email-cc.test.ts`: the CC is present even when the client omits it; the CC is not duplicated when it is also a recipient; the default draft includes period name, totals and the confidentiality line; an oversized PDF is refused rather than sent.
- No database migration, no change to payroll figures, periods, adjustments or history, and no email sent during testing.
