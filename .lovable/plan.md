# DPS signature and front-of-house alcohol signatures

Two things to finish the "who can sell alcohol" file: one electronic signature from the DPS covering all three sites, and a clear list of front-of-house people you can tick and email individually.

## 1. Request the DPS signature (once, all sites)

- New "DPS authorisation — all sites" request, alongside the existing per-site documents.
- The document names Carnaby, Brixton and Fitzrovia with each site's premises details, and states that the named front-of-house staff at those sites are authorised to sell alcohol under his supervision as Designated Premises Supervisor.
- His email address is saved once with the licence details, so it is filled in for you. You can change it before sending.
- Before sending you see: his name, his email, which sites are covered, the link expiry and the exact wording of the email.
- The email asks for his signature for this one purpose only — no other document, no reminders. It says not to reply to it.
- He opens the secure link on his phone, reads the document, signs, and the signature and time are recorded.
- Once signed, that signature is a standing authorisation: it stays valid as people join or leave, and it appears on each site's downloaded authorisation. You can request a fresh one whenever you choose.
- Existing per-site DPS requests, signatures and records stay exactly as they are.

## 2. Selecting front-of-house staff and sending their signature links

- The send screen gains an "All sites" option as well as the three sites.
- Each person shows their name, role, the sites they work at, and their state: Signed, Awaiting signature, or No email address on file.
- Someone working at more than one site appears once, with all their sites shown. One signature covers every site they work at, and they then appear on each of those sites' files.
- You tick the people you want, review the list and addresses, then press Send. Nothing is sent until you confirm.
- Leavers, archived and test records never appear.

## 3. What the downloaded file shows

- Each site's authorisation sheet keeps its current layout: Name, Role, Signature, Date.
- The DPS signature block shows his signature, the date and that it was signed electronically, or "Not yet signed" when it has not been.

## Technical notes

- `premises_licences`: add `dps_email` (nullable text). No other schema change; staff coverage across sites is already held in `employee_branches`.
- `licence_signature_requests`: reuse `subject_type = 'dps_authorisation'` with `branch` set to a group marker plus the covered branch list in `document_body`, so existing per-site rows and status logic are untouched.
- `src/lib/licensing-documents.ts`: new `buildDpsAuthorisationAllSites(sites, date)` pure builder; `isReadyToSend` extended for the group case (needs every site's premises details confirmed).
- `supabase/functions/send-licence-signature/index.ts`: accept a multi-site DPS target; staff branch is derived from `employee_branches` so one staff request covers every site the person works at.
- `send-notification`: new DPS signature-request template, first name plus secure link plus the existing do-not-reply footer.
- `SendStaffAlcoholDialog`: "All sites" option, per-person site chips, dedupe by employee.
- `AlcoholAuthorisationBoard` / `PremisesLicencePanel`: show the standing DPS signature and its date on every site.
- Tests: group document wording and readiness, cross-site staff dedupe, DPS email default, do-not-reply wording.

## Not done without your approval

- No email is sent to the DPS or to any staff member until you press Send and confirm.
- No existing record, signature, status or historical document is changed.
- Reminders stay off.
