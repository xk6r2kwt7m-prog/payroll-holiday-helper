# File the two Level 2 Food Safety certificates

## What the certificates say

| | Sultan Al Mabrut (record: Sultan Al Mabrur) | Hafiz Abdur Rahim (record: Hafiz Rahim) |
|---|---|---|
| Course | Level 2 Food Safety and Hygiene for Catering | Level 2 Food Safety and Hygiene for Catering |
| Awarded | 20 September 2026 | 20 September 2026 |
| Certificate number | P2M6-HS77-SDT9-PWPM | 7DY1-TM3L-96RR-O3LT |
| Provider | Virtual College Ltd, Leeds (CPD certified, RoSPA assured) | Virtual College Ltd, Leeds (CPD certified, RoSPA assured) |
| Signed by | Jamie Ashforth, Business and Strategy Director | Jamie Ashforth, Business and Strategy Director |

Both cover the same 13 topics, including HACCP, allergens, temperature control and personal hygiene.

## Current state

- Sultan's certificate is **already filed**: a training record exists (no legal expiry, refresher review 20 Sep 2029) and the PDF is already stored against his staff file. The upload you sent is the same certificate, so nothing needs re-filing for him.
- Hafiz has **no training record and no certificate on file**.

## What I will do

1. Store Hafiz's certificate PDF in the secure staff-document store, alongside the other Level 2 certificates, and link it to his staff record.
2. Add his training record: Level 2 Food Safety and Hygiene for Catering, Virtual College Ltd, obtained 20 September 2026, **no expiry date**, refresher review due 20 September 2029 — matching how Sultan's is recorded.
3. Record the certificate number, the signatory and the topic list in the record notes, so the certificate can be traced to its source document.
4. Leave Sultan's existing record and stored PDF untouched, and leave the name-spelling difference ("Al Mabrut" on the certificate vs "Al Mabrur" on his record) flagged for your review rather than changing either.

Nothing is emailed, no reminder is switched on, and no other record or status changes. Level 2 Food Safety carries no legal expiry, so neither record will ever show as "expired" — only a refresher review date.

## Technical notes

- Upload the PDF to the `employee-documents` bucket at `compliance/<tenant>/certificates/hafiz_abdur_rahim_level2_food_safety_2026-09-20.pdf`.
- Insert one `training_records` row: `certification_type` `food_hygiene`, `date_obtained` 2026-09-20, `expiry_date` null, `review_due_date` 2029-09-20, `certificate_file_path` set to the uploaded path, `tenant_id` a0000000-…-0001, `employee_id` 34c79b6d-fbfb-4bae-8b61-6e140df8ecd4.
- No schema or UI changes; the existing "No expiry — refresher review due" badge already handles this case.
