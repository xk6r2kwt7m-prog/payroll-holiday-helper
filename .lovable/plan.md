# Training and induction on the website, built from your own documents

You asked for your training documents to be filed correctly and then turned into
proper web pages staff can read on their phone — not PDFs sent by email.

Your decisions: **separate induction packs per role**, **content rewritten into
polished lessons** (you approve before staff see them), **manager material kept
to managers and supervisors only**, and **nothing is built until you have
uploaded the rest of the documents**.

## Where the documents you sent will be filed

| Document | Filed under | Who sees it |
| --- | --- | --- |
| UD DOs and DON'Ts (Front of House) | Staff induction | Front of House |
| Ugly Dumpling Guide Book | Staff induction | All staff |
| UD Kitchen Guide Book | Staff induction | Kitchen |
| Allergy Protocol Training | Allergens | All staff |
| Ugly Dumpling FS HACCP (restaurants) | Food safety | Kitchen, managers |
| Ugly Dumpling Market FS HACCP | Food safety | Kitchen, managers (markets) |
| Quality Control in Food Preparation and Stock Management | Food safety | Managers and supervisors |
| UD Restaurant Operations Guide for Managers | HR policies / operations | Managers and supervisors |

Duplicates (`-2` copies, and the same guide sent as both Word and PDF) are filed
once, with the best-quality file kept as the original. Nothing already in the
system is overwritten or renamed.

## What staff will see

Three induction packs, each a short guided journey on the website:

- **Front of House** — welcome and standards, DOs and DON'Ts, service steps,
  allergens, food safety basics, alcohol rules, health and safety.
- **Kitchen** — welcome, kitchen guide, HACCP food safety, allergens, cleaning,
  quality standards, health and safety.
- **Managers and supervisors** — everything above plus the Operations Guide,
  quality control, licensing duties, incident handling.

Each pack is a set of lessons. A lesson reads like a well-made web page: a short
"why this matters", clear key points, step-by-step standards, common mistakes,
and real service scenarios. Progress saves as they go, so they can stop and come
back. Short comprehension checks appear between lessons, and the pack finishes
with a declaration they sign — recorded against their staff record with the exact
version they completed, as it already works today.

## Presentation

- Designed for a phone first: one idea per screen, large readable type, generous
  spacing, a progress bar, and next/back that never loses their place.
- Consistent look: calm white pages, clear section headings, key rules in
  highlighted panels, DO and DON'T shown as two clearly separated lists.
- Every lesson shows how long it takes and what they will be able to do at the end.
- The original PDF is always still there to open if they want it.

## Your control

- Every rewritten lesson starts as a draft. You read it, edit any wording, and
  approve it. Staff cannot be sent an unapproved lesson.
- Comprehension questions are drafted for you and also need your approval.
- Nothing in payroll, holiday, scheduling, contracts or existing compliance
  records changes.

## Technical notes

- Lessons are authored as structured content in the existing
  `src/data/training-standards` format (`LessonContent`, source-classified
  points), so they render through the existing lesson viewer and stay versioned
  in code rather than as free text.
- Files are stored in the existing document library
  (`compliance_documents`, employee-documents bucket) with category, branch and
  role targeting, `include_in_induction`, and approval status — reusing the
  Phase 1 fields already in place. Induction selection continues to use
  `selectInductionDocuments`.
- Role packs use the existing `induction_packs` / `induction_pack_items`
  structure with a role bucket on the pack, so completed versions stay preserved.
- The on-screen reader (`document_reader_sections`, questions with manager
  approval) stays as the fallback for documents that are not hand-authored.
- Tests: pack-selection per role, lesson registry coverage, approval gating so
  drafts cannot be sent.

## Before I start

Send the remaining documents. Ones I expect are missing:

1. Health and safety policy / risk assessments for each site
2. Cleaning schedules and opening/closing checklists
3. Service steps and menu / product knowledge material
4. Age verification (Challenge 25) and refusals procedure
5. Uniform, conduct and disciplinary policy
6. Anything else you use on a new starter's first shifts

Once they are in, I will confirm the filing table above and start building.
