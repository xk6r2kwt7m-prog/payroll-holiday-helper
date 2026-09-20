# Make the alcohol authorisation reviewable, and Philipp's email easy to edit

Three things: let you read the document before anything can be sent, put his email address where you are already looking, and settle whether staff signatures are needed at all.

## 1. Why the button is greyed out

The button is blocked because one licence detail is still blank: Carnaby's premises licence holder. That is why you cannot open anything.

Change: the button no longer blocks reading. It becomes **Review the authorisation** and always opens, showing:

- His name, his email address, the sites covered, how long the link stays open.
- The full wording of the document he would sign.
- The exact email he would receive.

If a licence detail is still missing, the final **Send for signature** button on that screen stays off and says plainly what to confirm first, with a link straight to that site's licence details. So you can always read and check; only sending waits.

## 2. Adding or changing his email address

Today it lives inside each site's premises licence details, which is a long way from where you need it.

Change: on the review screen his email is an editable field with an **Edit** pencil beside his name.

- Typing a new one and pressing **Save his email** stores it against all three sites, so it is filled in next time.
- Changing it here never sends anything.
- The previous address is kept in the record of the change, as with every other detail.

## 3. Do staff actually need to sign? (Britain — Licensing Act 2003)

Short answer: **no, their signature is not required by law.**

- Every sale of alcohol must be made by, or authorised by, a personal licence holder. At your sites that is the Designated Premises Supervisor.
- The authorisation does **not** have to be in writing and the staff member does **not** have to sign it. The law only requires the authorisation to exist and to be traceable.
- Home Office guidance and licensing officers in practice expect a written, dated list of the people authorised, signed by the personal licence holder — which is exactly what his one signature gives you.
- So a named, dated list of front-of-house staff, under his signature, is enough. Staff signatures are extra evidence that they were told, not a legal requirement.

Change to match that: staff signatures become optional.

- Each site's list keeps every front-of-house person, and the state reads **Listed** rather than "Awaiting signature" — no more amber warning implying something is missing.
- The downloaded sheet keeps Name, Role, Signature, Date; the Signature column shows the signature where one was collected and stays blank where it was not, with a line saying the list is authorised by the DPS's signature above.
- You can still ask any individual for a signature if you want that extra record. Nothing is removed.

This wording is operational, not legal advice. If you want it checked by your licensing solicitor before the sheet changes, say so and I will leave the current wording alone.

## Technical notes

- `DpsStandingAuthorisation.tsx`: dialog opens regardless of readiness; readiness gates only the final send action; inline email field saving `dps_email` across every tenant licence via `useSavePremisesLicence`; deep link to the site panel for outstanding details.
- `src/lib/dps-register.ts` / `alcohol-authorisation-status.ts`: "awaiting signature" reframed as "listed", `outstandingSignatureLine` becomes informational, counts relabelled (Listed / Signed).
- `LicensingDocumentPDF`: blank signature cells permitted plus the "authorised by the DPS signature above" footer line.
- Existing per-site documents, signatures, statuses and records unchanged; readiness helpers keep their current behaviour for the per-site flows.
- Tests: dialog opens when details are outstanding and send stays blocked, email save writes to all sites, listed-vs-signed wording.

## Nothing sent

No email goes to Philipp or any staff member until you press Send and confirm. Reminders stay off. No existing record or signature changes.
