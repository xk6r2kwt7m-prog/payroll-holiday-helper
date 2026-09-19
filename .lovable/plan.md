# Who can sell alcohol — everyone front of house, signatures collected, clean download

## What changes on screen

**1. Front of house is treated as authorised by the licence holder**

Today every front-of-house person shows as "Not authorised" and a red banner says alcohol must not be sold at any of the three sites. That reads as a licensing breach when in fact the licence holder authorises all front-of-house staff.

After this change, each site shows all front-of-house people as covered by the DPS authorisation, and the counts change to what actually matters:

- People covered (everyone front of house at that site)
- Signed
- Awaiting signature

A person's line reads "Signed" with the date, or "Awaiting signature". Nobody is shown as barred from selling.

**2. A softer note instead of the red warning**

The red "Nobody is authorised — alcohol must not be sold" banner goes. In its place, where a site has nobody who has signed yet, a calm amber note says signatures are still outstanding for that site and names how many. It is worded as missing paperwork, not as a ban on selling.

**3. Signatures are still collected exactly as now**

Nothing about collecting signatures changes: you choose the people, you see the confirmation step with each name and email address, and nothing is sent until you press the send button. No reminders, no automatic sending.

## What changes in the download

The authorisation sheet keeps its wording and the DPS signature block, but prints only what a licensing officer needs:

- Columns: Name, Role, Signature, Date. The "Status" column is removed.
- All front-of-house staff at that site are listed, with signature and date shown for those who have signed and a ruled blank where they have not — so the same sheet can be signed on paper.
- Empty filler rows only appear when the site has no names at all.
- People who have left are not listed.
- Licence details we do not hold are left out rather than printed as a blank label.
- The summary line under the heading states how many of the listed staff have signed, instead of an authorisation warning.

The CSV export keeps its fuller detail for internal use, since it is not the document handed over.

## Technical notes

- `src/lib/dps-register.ts`: status vocabulary becomes `signed` / `awaiting_signature` for front-of-house rows (approval by the licence holder is what puts a row into `signed` where a record exists; a front-of-house person with no record is `awaiting_signature`, never `not_authorised`). `registerSummary` returns `covered`, `signed`, `awaitingSignature`; `nobodyAuthorised` is replaced by `noneSigned`. `registerSummaryLine` rewritten. `registerPdfRows` drops `status_label` and excludes `no_longer_employed` rows. `registerCsv` unchanged.
- `src/components/compliance/LicensingDocumentPDF.tsx`: remove the status column and widen name/role/signature; filler rows only when `staff.length === 0`; omit signature-block fields whose value is the blank placeholder; `warningLine` restyled as a neutral note.
- `src/components/compliance/AlcoholAuthorisationBoard.tsx`: three counters, amber outstanding-signature note, per-person "Signed / Awaiting signature" chip. The role-decision group and send flow stay as they are.
- `src/hooks/useDpsRegister.ts` updated for the renamed summary fields.
- Tests: extend `src/test/phase-dps-register.test.ts` and `src/test/phase-licensing-documents.test.ts` — no front-of-house person is ever labelled not authorised, leavers absent from the PDF rows, no status column in the PDF, blank licence fields omitted, filler rows only when the site list is empty, sending still requires the confirmation step.

## Not included

No emails, links or reminders are sent. No existing authorisation record, signature or approval is changed, and no record status is rewritten in the database — only how the register is presented and printed.
