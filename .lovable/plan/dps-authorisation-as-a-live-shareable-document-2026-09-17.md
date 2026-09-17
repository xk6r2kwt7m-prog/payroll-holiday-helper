# DPS authorisation as a live, shareable document

Today each site's DPS written authorisation only lists people who have already signed, and it can only be downloaded as a draft PDF from the licence panel. This makes it a full site register you can hand over, download or email on request — while keeping the rule that nobody is authorised until the licence holder approves.

## What changes for you

**1. Every front-of-house person for the site appears on the document**

The authorised-staff table is built from the site's actual team, not just from signatures:

- everyone front of house at that site, and
- anyone else at that site who already holds an authorisation (for example a kitchen or office person you authorised by hand).

Each row shows the person's name, role, their signature and date if they have signed, and a plain status where they have not: *waiting to sign*, *signed — waiting for the licence holder*, *not authorised*. Unsigned rows still print with a blank signature line so the sheet works on paper.

A short summary line at the top of the table states how many can currently sell alcohol, and the document warns clearly if nobody at that site is authorised.

**2. Download or email the document to anyone**

From each site's licensing documents, and from the "Who can sell alcohol" board:

- **Download** — the current document as a PDF.
- **Email a copy** — you type any recipient (licensing officer, landlord, insurer), add an optional message, and choose:
  - the PDF attached, and/or
  - a secure view link that expires (default 14 days, you can change it).

Nothing is sent automatically and nothing is sent to staff by this action — it is a manager-triggered send only.

**3. Every issued copy is kept**

The document is always rebuilt from today's data, and each time you download or email it a record is kept: the date, who issued it, the recipient, the delivery method, the link expiry, and the exact list of names it contained. An "Issued copies" list under each site shows this history, and you can re-open a link's status or revoke a link.

## Technical notes

**Data**

- New table `licence_document_issues` (tenant-scoped, RLS to admin/manager/supervisor per existing pattern, plus GRANTs): `id, tenant_id, branch, licence_id, subject_type, issued_by, issued_by_name, recipient_name, recipient_email, delivery_method ('download'|'email_attachment'|'email_link'|'email_both'), message, snapshot jsonb, file_path, access_token, token_expires_at, revoked_at, opened_at, open_count, created_at`.
- `snapshot` stores the rendered document body and the exact staff rows (name, role, status, signed/authorised dates, approver) — never edited afterwards.
- Every issue writes an `audit_log` entry (`licence_document_issued`, `licence_document_link_revoked`).
- No change to `alcohol_authorisations`, `premises_licences`, `licence_signature_requests` or any existing signing/approval logic.

**New pure logic — `src/lib/dps-register.ts`**

- `buildDpsRegister(site, employees, authorisations, now)` → rows for the site: FOH staff (via existing `isFrontOfHouse`) union anyone with an authorisation record at that branch, each mapped to a `RegisterRowStatus` derived from the existing `resolveAuthorisationStatus`; leavers/archived excluded unless still authorised (then flagged); sorted by status then name.
- `registerSummary(rows)` → counts + `nobodyAuthorised` flag.
- `registerCsv(rows)` for the inspector list.
- No inference: a person with no record is `not_authorised`, never assumed.

**PDF — `LicensingDocumentPDF.tsx`**

- Extend `SignedStaffRow` to carry `job_title` and `status_label`; add a Status column for `dps_authorisation`; keep the existing blank-row fallback for a paper sheet.
- Add the summary line and the "nobody authorised" warning; keep the existing DPS signature block, statement and audit footer unchanged.

**Sending — new edge function `send-licensing-document`**

- Auth: signed-in admin/manager only, tenant-scoped (same pattern as `send-licence-signature`).
- Builds the document server-side from the same pure helpers, stores the PDF in the compliance storage path, records the issue row, then sends via the existing Postmark sender with the PDF attached and/or a link to `/document/view` guarded by `access_token` + expiry + revocation.
- Test-record staff are excluded from the register.

**UI**

- `PremisesLicencePanel.tsx`: DPS card gains "Email a copy" plus an "Issued copies" list; download now uses the full register.
- `AlcoholAuthorisationBoard.tsx`: adds "Download the authorisation" and "Email a copy" per site alongside the existing CSV/print.
- New `EmailLicensingDocumentDialog.tsx` (recipient, message, attachment/link toggles, expiry).

**Tests** — `src/test/phase-dps-register.test.ts`: register composition (FOH union authorised, leavers, test records), status mapping, summary/nobody-authorised, CSV, snapshot immutability, link expiry/revocation rules.

**Untouched:** payroll, holiday, contracts, induction, incident book, and all existing signature/approval rules.
