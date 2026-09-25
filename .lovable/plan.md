# Findings: Ada Feliz details request — no email arrived

Investigation only. No files or data were changed.

## 1. The request
- Latest request `c9271d56…`: existing staff update, status **sent**, sent_at **25 Sep 2026 06:56:20 UTC**.
- Sent to **\*\*\*@hotmail.com**.

## 2. Sign-in check
- `send-notification` accepted the call; there was no 401 for this send.
- The only `[auth-guard]` line is at 06:48:46 ("401: no key sent"). That was my own check, a call made without signing in, after the earlier fix. It is not related to this send.

## 3. Rules after the sign-in check
- The recipient allow-list did not block it. The email went on to the provider.
- It was not a test send (`test_send: false`), so no "[TEST]" was added to the subject.
- `send-notification` has no suppression list or skip rule on this path. Nothing held the email back.

## 4. Email provider
- Postmark **accepted** it: `status=sent`, message id `01042601-ec64-4d18-97d2-02c2770eb664` (06:56:22 UTC).
- One more thing: at 06:53 a **reminder** for Akhil Vidukula's request also went to the same hotmail address. Postmark accepted it too (id `e302607e…`). So today's earlier failed request has now been resent as a reminder, after the fix.

## 5. Audit log
- `employee_info_request_sent` for this request, 06:56:22 UTC, no error.

## 6. Was the email change saved?
- **No.** Ada's staff record still holds a **\*\*\*@gmail.com** address. The record was last updated on 18 Sep.
- So the hotmail address was not taken from her record. It came from the "send to a different address" option in the send dialog (`recipientOverride`, send-info-request line 245). That option sends to the typed address without changing her record.

## Most likely reason it didn't arrive
Our side worked and Postmark accepted the email. The problem is between Postmark and the hotmail inbox. Most likely it is in Junk or Other, delayed, or filtered/bounced by Outlook/Hotmail.

## Suggested next checks (not done)
1. Search Junk and Other in that inbox for the subject "We need a couple of details from you".
2. Look up the two message ids in Postmark's activity log for delivered, bounced or spam-complaint status. We could also start recording Postmark's delivery results, if you want that.
3. If Ada's record should hold that address, it has to be saved on her profile. The send dialog doesn't change it.
