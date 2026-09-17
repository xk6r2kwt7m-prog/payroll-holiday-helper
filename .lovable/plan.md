# Keeping staff personal information safe

Staff now send you their legal name, date of birth, National Insurance number, home address, bank details and right-to-work photos. This plan closes the gaps that would let that information leak, and gives you a record you can show a regulator.

## What already protects it

- Each company's records are separated in the database, so one company can never read another's staff.
- Sensitive fields on screen are hidden until you click to reveal them, and re-hide automatically.
- Uploaded documents and photos live in a private store; links are short-lived and issued only to people allowed to see the file.
- Every reveal, edit and confirmation decision is written to an audit trail that cannot be quietly rewritten.
- The staff details link expires on a date and is tied to one person's request.

## What is not safe yet (confirmed by today's security scan)

1. **Identity data can be read without signing in.** The document-reading service accepts a document reference and returns the extracted passport number, date of birth and nationality with no login check at all. This is the most serious issue for personal data.
2. **Company email can be sent by anyone.** The notification service will send any listed email type to any address using your verified sending domain — a phishing risk that would arrive looking like it came from you.
3. **Maintenance tools are wide open.** Six behind-the-scenes repair tools (merge duplicate employees, archive leavers, holiday rebuilds, historical payroll import and two others) run with full database rights and no login check. One of them works across every company at once and can delete employee records.
4. **AI candidate matching can be triggered by anyone**, wiping match results and spending credits.

## What I will do

**Priority 1 — lock every open service (fixes 1-4)**
Require a valid signed-in session on each one, then confirm the person is a member — and for the repair tools, an administrator — of the company whose data is being touched. The company reference will be taken from the signed-in session, never from what the caller sends. Anything that fails these checks is refused and logged. The staff details link stays public by design (staff have no account) but keeps its single-token, expiring behaviour.

**Priority 2 — tighten the staff details link**
Stop accepting the link once the person has submitted, so a forwarded link cannot be reopened to read back what they entered. Shorten the default life of the link and let you cancel or reissue one from the person's record.

**Priority 3 — a privacy record you can show**
- A "Who saw what" view per employee, listing every reveal, download and confirmation decision with date and person.
- A written retention position: how long right-to-work photos, bank details and submitted answers are kept, and a manager action to remove a submission's raw answers once it has been filed onto the record.

**Priority 4 — verify, don't assume**
Attempt each locked service without signing in and confirm it is refused; attempt to read another company's document and confirm it is refused. Results reported to you. Where a signed-in check cannot be run in the sandbox I will say so plainly rather than claim it passed.

## Technical detail

- Add `auth.getUser()` gating plus tenant-membership (and `is_tenant_admin` for maintenance) checks to: `extract-document`, `send-notification`, `merge-duplicate-employees`, `resolve-orphan-payments`, `import-historical-payroll`, `backfill-holiday-ledger`, `rebuild-holiday-carryover`, `archive-leavers`, `talent-ai-match`. Set `verify_jwt = true` where the function is only ever called from the app.
- Derive `tenant_id` server-side from the resolved user; ignore body-supplied tenant identifiers. Scheduled callers use a shared server-side secret instead of a session.
- `merge-duplicate-employees` gains a mandatory tenant filter; cross-tenant use restricted to platform admins.
- `employee_info_requests`: refuse GET/POST when `status = 'submitted'`; add manager revoke (clear token) and reissue.
- Privacy view reads `audit_log` + `document_audit_log` filtered by employee.
- No schema changes to `employees`, payroll or holiday tables; no existing records altered.
- Mark the four scan findings fixed only after the refusal checks pass.
