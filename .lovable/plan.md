# Add the Brixton and Carnaby licensing documents

Three new documents (the two "-2" uploads are identical copies, so five files are three documents):

- Brixton premises licence — London Borough of Lambeth
- DPS written authorisation to sell alcohol — Brixton, 10 Market Row
- DPS written authorisation to sell alcohol — Carnaby, 1 Newburgh St

## What the documents say

Brixton premises licence (Lambeth, dated 3 August 2020):
- Licence number Prem2191, version reference 20/00223/PRMTRN
- Premises named on the licence: Thunderbird Fried Chicken, 10 Market Row, London SW9 8LD
- Licence holder: AG Hondo Market Row BV, Amsterdam
- Designated Premises Supervisor named on the licence: Stephanie Brown
- Alcohol and recorded music: Monday to Sunday 10:00–23:00, plus New Year's Eve
- Opening hours: Monday to Sunday 10:00–23:30
- Alcohol on and off the premises; alcohol only alongside food
- Age verification: Challenge 21 with PASS-hologram photo ID
- CCTV kept in working order, footage held 31 days, a trained member of staff on site
- An incident log recording crimes reported, ejections, complaints about crime and disorder, disorder, alcohol refusals and visits by an authority or emergency service
- All staff trained on alcohol sales before serving, records available on request

Carnaby DPS authorisation: Ugly Dumpling, 1 Newburgh St W1F 7RB, reference 17/06374/LIPDPS, Philipp Chaykin, personal licence 17/05171/LIPERS, City of Westminster Council, signed 3 September 2026.

Brixton DPS authorisation: Ugly Dumpling, 10 Market Row SW9 8LD, reference 20/00370/PRMTRN, Philipp Chaykin, Lambeth Council, signed 3 September 2026.

## What I will do

1. Store all three PDFs in the document library, filed under Alcohol licensing / Licences and permits, targeted at the right site, with their reference numbers and dates.
2. Fill in the Brixton licence card from the licence itself: number, authority, licensed hours, opening hours, on and off sales, and activities. Attach the licence PDF and the Brixton DPS authorisation.
3. Fill in the Carnaby licence card with the reference and authority from its DPS authorisation, and attach that document. The Carnaby premises licence itself is still missing, so the card will keep saying so.
4. Record the Brixton licence conditions as separate, checkable items, each with plain-English staff wording, who is responsible, how often it is checked and what evidence is needed — CCTV and footage retention, the incident log, food alongside alcohol, staff training before serving, and Challenge 21 age checks.
5. Link the Brixton incident-log condition to the incident book, exactly as Fitzrovia condition 28 already is, so those incident types must be recorded within 24 hours at Brixton too.
6. Keep Challenge 25 as your house policy at Brixton and note on the record that the licence requires Challenge 21 as a minimum, so your own policy is stricter and satisfies it.

## Things I will flag, not change

These conflicts are recorded on the licence card for you to resolve. Nothing is overwritten and no document is altered.

1. The Brixton licence names **Thunderbird Fried Chicken** as the premises, **AG Hondo Market Row BV** as the holder and **Stephanie Brown** as DPS. Your DPS authorisation names **Ugly Dumpling** and **Philipp Chaykin**. Either the licence has been transferred and varied since 2020 and you hold newer paperwork, or the authorisation is being signed against a licence that does not yet name Philipp Chaykin. Until you confirm, the card will show the licence as uploaded and mark holder and DPS as needing confirmation.
2. On the Brixton authorisation, the personal licence number is filled in as **20/00370/PRMTRN**, which is a premises reference. Philipp Chaykin's personal licence elsewhere is **17/05171/LIPERS**. The document will be filed as **Draft requiring correction** with that reason on record, and the version the app generates for signature will use the correct personal licence number.
3. The Carnaby number **17/06374/LIPDPS** looks like a DPS variation reference rather than the premises licence number, so it is recorded as awaiting confirmation against the Carnaby premises licence.
4. Brixton and Carnaby conditions are recorded only from their own licences. Nothing from Fitzrovia is copied across as a confirmed requirement.

## Technical notes

- PDFs go to the existing compliance storage area; `compliance_documents` rows link to `premises_licences` through the existing document slots.
- Brixton conditions go into `premises_licence_conditions` (branch-specific), and the condition-28 style incident categories are extended to Brixton in `src/lib/incident-categories.ts` per branch rather than globally.
- Data-only inserts plus one small code change for the per-branch incident-recording requirement; existing records, wording and workflows are untouched.
