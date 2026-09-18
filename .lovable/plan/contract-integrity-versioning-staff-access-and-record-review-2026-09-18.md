# Contract integrity, versioning, staff access and record review

No existing signed contract will be restamped, reformatted, regenerated or reworded. Everything below either protects existing files, adds separate new records alongside them, or applies only to contracts generated after the change.

---

## Priority 1 — Protect existing signed documents

**Storage immutability.** Replace the storage rules on the `employee-documents` bucket so that any object whose path sits under `contracts/final/...` or is referenced by a contract record in state `signed`, `superseded` or `terminated` cannot be updated or deleted by anyone, including administrators. This is enforced by database policy on `storage.objects`, checked against the contract record, so it cannot be bypassed from the app, from a script, or by a signed-in administrator.

**Writes become create-only.** The completed-file write in signing stops using overwrite. If a file already exists at the target path the operation fails rather than replacing it.

**Rebuild becomes "recovery copy", never a replacement.** The existing "rebuild completed copy" action will:
- refuse to touch the original path;
- require a typed reason before it runs;
- write to a new path `contracts/recovery/<contract>/<timestamp>_recovery.pdf`;
- store a new row in a new table `contract_file_recoveries`: contract, original path and fingerprint, new path and fingerprint, reason, administrator, date and time;
- write a permanent audit entry;
- show in the interface as "Recovery copy — [date]", clearly subordinate to the original, with a link both ways.

The original signed file remains the authoritative document in every circumstance; nothing in the system will ever point away from it.

**Dated integrity check.** A new table `contract_integrity_checks` records, per contract: the fingerprint recalculated from the stored file, the stored fingerprint, match or mismatch, and the date and time of the check. A first check is run for all 12 existing signed contracts and the terminated one. Every screen and report wording will read: *"File confirmed unchanged as at [date/time]. This confirms the file from the date checked and is not evidence of its condition before that date."* Repeat checks can be run on demand; a mismatch raises a visible alert and is never auto-corrected.

---

## Priority 2 — Future contracts only

**Permanent reference and page furniture.** New contracts get a reference issued at generation (format `UD-EC-2026-0001`, sequential per company, never reused) stored on the record and printed on every page, together with: employee name, page X of Y, issue date, contract version, and wording/template version. Existing contracts get a reference at record level only (Priority 3).

**Template versioning.** The contract wording moves from loose code constants into numbered, dated template releases (`contract_template_versions`: version, effective date, full clause text, checksum, who published it). Each generated contract stores the version used *and* a complete snapshot of the exact wording and terms as generated. A new wording release creates a new version; earlier versions, the contracts that used them and their files all remain intact and viewable.

**Two separate confirmations before signing**, replacing the single tick:
1. "I confirm that I have read and accept the complete employment contract, including its schedules and any documents expressly incorporated into it."
2. "I consent to signing this document electronically."

Where a contract carries no schedules and incorporates no documents, confirmation 1 is shown without the schedules wording. The text shown is derived from that contract's actual contents and the exact wording displayed is stored with the signature, as now.

**Verified signatory email.** Before signing, both employee and employer must see and confirm the email address on record (correcting it if wrong); the confirmed address is stored with the signature. Signing cannot proceed without it. Everything currently captured — signature, name, timestamp, IP, device, consent wording, fingerprints — continues unchanged.

**Automatic delivery on completion.** Once both signatures are in, the completed contract and signing certificate are sent to both parties automatically. Each send records recipient, date, time, delivery status and the provider's reference, against the contract record. (Note: today's delivery audit entries are filed against the signing link rather than the contract, which is why delivery history is hard to read — this will be corrected for new sends and existing entries left as they are.)

---

## Priority 3 — Access and existing records

**Staff self-service.** Staff can view and download only their own completed contract and signing certificate, while their account is active. Achieved with a database policy limiting reads to the signed-in person's own record in `signed`/`superseded`/`terminated` state, plus short-lived download links. No access to drafts, internal notes, amendment workings, or anyone else's documents. Each person also keeps the emailed copy for their own records.

**References for existing contracts** are written to the database record only. No PDF is opened, stamped or regenerated.

**Execution certificates for existing electronically signed contracts** are generated as separate new documents from evidence already held (names, roles, timestamps, emails where recorded, IP, device, consent wording, both fingerprints). Where a field was not recorded at signing, the certificate states "Not recorded at the time of signing" — it will never imply verification that did not happen. Four signatures hold no email address (Karl Ted Ledesma — both; Ad Tesst — employer; Rafaela Barbosa Tramon — employee) and will be marked accordingly.

**Legacy uploads** are labelled "Uploaded copy — executed outside the system", with a note of what evidence exists. No electronic-signature evidence is fabricated for them.

### Records requiring your individual review

**Six records with no state recorded** — all hold a generated file, none has a completed file, fingerprint or signature. My recommendation for each, for your decision, not applied automatically:

| Record | Evidence held | Recommended |
|---|---|---|
| Mya Nahla Sabrah (25 May) | draft file only, never sent | Draft — or cancel, 4 months old |
| Carlos David Duarte Madrid (27 Jul) | draft file only, never sent | Draft |
| Phanindra Danda (27 Jul) | draft file only, never sent | Draft |
| Cleo Howard (27 Jul) | draft file only, never sent | Draft |
| "Sultan Employment Contract" (17 Sep) | draft file only, never sent | Draft — name doesn't follow the usual pattern, worth checking it's the right person |
| Varsha Kumari (17 Sep) | sent; employer signed 17 Sep; employee has not | Awaiting employee signature |

**The two "Hafiz contract" records are not duplicates.** They are identical in name only and belong to two different people: one to **Hafiz Rahim**, one to **Sultan Al Mabrur**. Both are filed as signed with no signature records — uploaded copies. Neither will be deleted. My reading is that the record on Sultan Al Mabrur was filed under the wrong name, or the wrong file was attached to him. Please confirm which is correct before anything is renamed or relinked; I will make no change without that.

**Employees with no record of receiving their completed copy.** Delivery entries are currently filed against signing links rather than contracts, so I cannot yet state definitively who received what. Part of this work is to produce a verified list — contract, reference, person, current email address on record, and delivery status — for the signed contracts of: Ad Tesst, Carlota Albuez Cruz, Emerson Henrique Martins Bezerra, Karl Ted Ledesma (leaver, **no email on record**), Mira Rashid, Nicolas Vinicius Martins Bezerra, Nishanth Thota, Sang Hyun Daniel Lee, Victor Gabriel Figueroa Rodriguez, plus Rafaela Barbosa Tramon (terminated, **no email on record**) and the two uploaded Hafiz records. Nothing will be sent to anyone until you have checked that list and approved the recipients. There will be no bulk send button — sends are one by one, ticked by you.

---

## Priority 4 — Schedules and policies proposal (no wording change)

A separate written proposal, no code, listing every policy and document the current wording mentions (for example handbook, disciplinary and grievance procedures, health and safety, allergen procedures, data protection), and for each: the wording that refers to it, whether that wording appears to make it contractual, non-contractual or incorporated by reference, what wording would need to change, and the operational and legal implications of each classification. Also flagged: clause 4.6 cites the Data Protection Act 1998 while the business operates under GDPR/DPA 2018. Nothing in the contract changes until you approve it separately, and then only for future contracts or a properly signed variation.

---

## Varsha Kumari — outstanding contract

Confirmed from the records: email on file is **varshakumaridh08@gmail.com**; the employer signature was completed 17 Sep; the employee has an unused signing link that expires **25 Sep 2026, 12:45 UK time**, so it is still usable. There is also an older unused employee link from 17 Sep — I will report but not touch it.

I will prepare, not run: **Resend the same link** (identical token, no change to contract, fingerprint or the employer's signature) and **Extend the expiry** (date only). Both require your click. Nothing is invalidated or replaced without your approval.

---

## Technical detail

**Migrations (additive only, no drops, no renames):**
1. `contract_file_recoveries`, `contract_integrity_checks`, `contract_template_versions` tables with tenant RLS and grants.
2. `employee_documents`: nullable `contract_reference`, `template_version`, `terms_snapshot jsonb`, `issue_date`; sequence/function for reference allocation.
3. `contract_signatures`: nullable `email_verified_at`, `consent_items jsonb` (exact wording shown).
4. `storage.objects` policies: block UPDATE and DELETE where the object belongs to a contract in `signed`/`superseded`/`terminated`, or sits under `contracts/final/`.
5. Extend `trg_protect_locked_contracts` to also block changes to `contract_reference`, `terms_snapshot` and `template_version` once signed.
6. Staff SELECT policy on `employee_documents` and `contract_signatures`: own employee record only, signed states only.

**Backfill (data operations, run separately from schema changes):** references assigned to existing signed contracts; first integrity check recorded per contract; legacy uploads labelled; template version 1 registered as "as generated before versioning — snapshot not available", never back-dated as if snapshots existed.

**Tests:**
- byte-for-byte proof: SHA-256 of every existing completed and original file captured before and after each migration and backfill, asserted identical;
- storage policy tests: overwrite and delete attempts on a signed contract's files fail, as administrator;
- rebuild test: writes a new recovery path, leaves the original byte-identical, records reason/administrator/time;
- integrity check test: mismatch flagged, never auto-corrected;
- staff access tests: own signed contract readable; drafts, another employee's documents and internal records all refused;
- versioning test: publishing a new wording version leaves prior versions and their contracts unchanged and retrievable;
- confirmation-wording test: schedules wording only appears when the contract has schedules; exact wording shown is the wording stored.

**Rollback:** every migration is additive, so rollback is reverting the new policies and code — no data is transformed and no file is written or moved during migration. New tables can be left in place empty. The one irreversible element by design is that recovery copies and integrity checks, once written, are never deleted.

**Interface changes:** contract detail gains a "Document integrity" panel (reference, fingerprint, last checked, recheck button, recovery copies list); "Rebuild" becomes "Create recovery copy" with a required reason; a delivery panel showing recipient/time/status/provider reference per send, with one-by-one send to staff; a review queue for the six blank-state records and the two Hafiz records; template versions listed under settings with published dates; staff portal gains "My contract" with view and download of the completed contract and certificate only.

**Sequence:** Priority 1 first and on its own, then Priority 2, then Priority 3, with the Priority 4 proposal written in parallel as a document.
