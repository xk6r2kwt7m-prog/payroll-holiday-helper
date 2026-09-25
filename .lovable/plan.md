# Findings: why the two hotmail emails never arrived

Investigation only, read-only Postmark calls. Nothing was sent, and no files or data were changed.

## 1. The two messages
- The ids are `01042601-ec64-4d18-97d2-02c2770eb664` (Ada's request) and `e302607e-9b3f-46d6-8042-534904e04eb5` (Akhil's reminder).
- Our email step logged both as "sent" with these ids at 06:56 and 06:53 UTC.
- The Postmark server the project key opens ("UGLO HR Platform", type **Live**) answers **"This message was not found"** for both ids.
- That same server shows **no emails at all since 24 Sep**. The last email to that hotmail address was on 21 Sep ("Your induction documents").
- So there are no delivery, bounce or spam events for these messages on the Live server.

## 2. Suppression
- The hotmail address is **not suppressed** on the `outbound` stream.

## 3. Sender and stream
- In the code, emails go out from `UglyOps HR <support@uglyops.com>` on the `outbound` stream.
- Past emails on the Live server show a sender at `uglyops.com`.
- DKIM and Return-Path could **not be checked**. Postmark only shows these with an account-level key, and the project only holds a server-level key.

## 4. Last 7 days on the Live server (56 emails, all from before 24 Sep)
| Recipient domain | Sent | Bounced |
|---|---|---|
| hotmail.com | 26 | 0 |
| outlook.com | 15 | 1 soft bounce |
| gmail.com | 12 | 0 |
| icloud.com | 3 | 0 |
| uglydumpling.co.uk | 1 | 0 |

Hotmail and Outlook delivery was working normally up to 21 Sep.

## Most likely reason
Today's emails were accepted by a **different Postmark server** from the Live one that holds the delivery history. That server gave back message ids, but it has no record of delivering them. This fits a Postmark **sandbox or test server**, which accepts emails and returns ids but never delivers them. It could also be a different server whose key was swapped in.

This is **not confirmed**. I can't read which key the live email step uses, only that it is a different server from the one the project key opens. The key probably changed between 21 and 24 Sep. It is not the recent sign-in fix, because that only runs after the key has been chosen.

## What would fix it (needs your approval)
1. In Postmark, find the server that holds these two ids and check whether it is a Sandbox server.
2. Set the project's email key (Postmark server token) to the Live "UGLO HR Platform" server's token.
3. Then send one test request to yourself, and confirm it shows in Postmark's activity log as Delivered.
4. Optional: make the email step also log the Postmark server name, so a wrong key shows up at once.
5. Anything that should have gone out since about 24 Sep was never delivered. It would need resending, but only with your approval.
