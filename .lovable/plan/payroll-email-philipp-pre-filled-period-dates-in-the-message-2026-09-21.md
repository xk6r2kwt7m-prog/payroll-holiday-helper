# Payroll email: Philipp pre-filled, period dates in the message, "do not reply" wording

Three changes to the payroll Send window and its standard wording. Nothing is sent automatically — every send still waits for you to press Send.

## What changes

**Philipp is already there.** Opening the Send window now shows **Philipp Chaykin — philipp.chaykin@outlook.com** already in the recipient list, with his name shown (not just the address). You can still remove him for a one-off send or add anyone else. His details are a fixed line in the wording file, so changing them later is a deliberate one-line edit — never automatic.

**The message names the exact pay period.** The standard draft now states the period the payroll covers, using the period's own dates, for example "Pay period: 25 August 2026 – 21 September 2026." alongside the pay date.

**Clearer, more professional wording.** The standard draft becomes:

```text
Subject: Payroll — September 2026 (Ugly Dumpling)

Dear Philipp,

Please find attached the payroll report for September 2026,
covering the pay period 25 August 2026 – 21 September 2026.

It covers 34 people, 4,004.41 hours and a total of £59,163.15.
Pay date: 24 September 2026.

This is a confidential document. Please do not forward it.

This is an automated email — replies to this address are not
monitored. If you have any questions, please contact us through
the usual channel.

Aderito Barros
Ugly Dumpling
```

The greeting uses the recipient's first name when there is one recipient with a known name ("Dear Philipp,"), otherwise it falls back to "Hello,". Every word remains editable in the window, and "Reset to the standard wording" restores it.

**Replies go nowhere.** There is no reply-to address, so nobody can reply to the payroll mailbox by accident; the message itself tells them replies are not monitored and to use the usual channel. This matches your standing rule that staff communications stay manual.

## What does not change

You are still always copied to barros.aderito@hotmail.com (cannot be removed), the PDF is still attached and filed for the audit trail, bank details stay off unless you switch them on, internal notes stay out, and nothing sends without you pressing Send. No payroll figures, records or history are touched.

## Technical notes

- `src/lib/payroll-email-draft.ts`: add `PAYROLL_DEFAULT_RECIPIENT = { name: "Philipp Chaykin", email: "philipp.chaykin@outlook.com" }`; extend `PayrollDraftInput` with `periodStart`/`periodEnd` and `recipientName`; update `buildPayrollEmailMessage` to include the pay-period line (formatted en-GB, e.g. "25 August 2026 – 21 September 2026"), the automated-email / not-monitored paragraph, and a first-name greeting when a single named recipient is passed.
- `src/components/payroll/SendPayrollEmailDialog.tsx`: recipients become `{ name?, email }` entries; on open, pre-fill with `PAYROLL_DEFAULT_RECIPIENT`; pass `period.start_date`/`period.end_date` and the single recipient's first name into the draft builder; the preview shows name + email. Removing Philipp before send still works.
- `supabase/functions/send-payroll-email/index.ts`: no provider change needed (replyTo stays unset — do not send a Reply-To header); confirm the HTML body renders the new wording via the existing escaping.
- Extend `src/test/phase-payroll-email-cc.test.ts`: Philipp pre-fills and is removable; draft contains the pay-period date range, the "replies are not monitored" line and the named greeting; single unnamed recipient falls back to "Hello,".
- Deploy the edge function after the change. No email is sent during testing.
