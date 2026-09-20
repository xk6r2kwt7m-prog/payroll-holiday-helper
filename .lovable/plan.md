# Add the three uploaded documents to the system

## Your question first: does a Level 2 Food Safety certificate expire?

No — it carries no legal expiry date. Sultan's certificate shows an award date (20 September 2026) and a certificate number, and nothing else. What environmental health officers expect is a **refresher every three years**, so the honest way to record it is:

- Award date: 20 September 2026
- Expiry: none
- Refresher review due: 20 September 2029

So the record should show "No expiry — refresher review due 20 Sep 2029" rather than pretending it expires. Reminders would run against the review date on the same 90/60/30-day pattern already used elsewhere.

## What gets added

### 1. Sultan Al Mabrur — Level 2 Food Safety and Hygiene for Catering
Matched to the existing active kitchen record for Sultan Al Mabrur. Note the certificate spells the surname "Al Mabrut"; the record stays as held and the difference is noted, not corrected.

Recorded: course title, awarding body (Virtual College Ltd), certificate number, award date, the 13 topics covered, and the PDF itself as the evidence file. No expiry date; a three-year refresher review date instead.

### 2. Section 57 notices — Brixton and Carnaby
Both are signed and dated 20 September 2026, so they are filed as the authoritative signed copies, exactly as supplied. Each records:

- Premises licence holder: Philipp Chaykin
- Premises: Brixton, 10 Market Road, SW9 8LD / Carnaby, 1 Newburgh Street, W1F 7RB
- Where Part A is kept: the restaurant office folder
- Nominated people: Brixton — Aderito Barros (Operations Manager), Marco Ribeiro (Assistant Manager); Carnaby — Aderito Barros (Operations Manager), Lissette Paredes (Assistant Manager)

The wording in the uploaded files is not rewritten or reformatted, and the existing on-screen Section 57 builder is left untouched.

### 3. Flagged for your attention
**Fitzrovia has no Section 57 notice.** It is listed as outstanding for your review — nothing is generated or sent for it.

## Technical notes

- Sultan's certificate goes in `training_records` (`certification_type: food_hygiene`, `expiry_date` null) with the PDF uploaded to compliance storage and linked as evidence; a three-year review date is held so the existing expiry banding in `src/lib/compliance-expiry.ts` can drive reminders without implying a legal expiry. Where a record has no expiry, the certificates list reads "No expiry — refresher review due {date}".
- The two notices are stored as approved compliance documents scoped to their branch, classification `premises_licence_condition`, with the uploaded .docx preserved as the signed source file and nominated persons captured in the record's structured fields.
- Fitzrovia's gap surfaces through the existing compliance attention panel; no new feature.

## Not done

No emails, no staff notifications, no changes to existing records, licences, wording or statuses. Reminders stay off until you say otherwise.
