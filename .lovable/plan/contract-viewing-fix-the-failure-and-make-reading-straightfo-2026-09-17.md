# Contract viewing: fix the failure and make reading straightforward

## What is actually wrong

Two separate problems, both confirmed in the code.

**1. The "not ready yet" message staff saw (Sang's screenshot).**
The reading screen opens the contract page without saying which version it wants. That page assumes the *completed signed* version by default, while the file service assumes the *original* version. So before anyone has signed, the page asks for a file that cannot exist yet and shows "The completed signed contract file is not ready yet." Nothing is wrong with the contract or the link — it is a one-word mismatch. Every staff member reaching the reading step on that path hits it.

**2. Only the first page shows in the emailed signed contract.**
On a phone the contract page deliberately hides the built-in viewer (it was blank on phones), and inside email/WhatsApp browsers the phone's own PDF preview shows page one and stops. That is why you have to download to see the rest.

## What I will build

### Fix the version mismatch (root cause)
- The reading screen asks explicitly for the original contract; the completed-contract link keeps asking for the signed one.
- Remove the guess: the contract page requires the version to be stated, and the file service treats a missing version as the original.
- If the signed version genuinely is not built yet, the page falls back to the original with an honest note ("signed copy still being prepared") instead of a dead end — never presenting the unsigned file as signed.

### A real in-page reader (fixes "first page only" and blank screens)
Replace the phone-hostile embed with a scrolling reader built into the page that renders every page of the PDF as images, on phone and desktop alike:
- All pages one after another, pinch/zoom, page counter ("Page 3 of 6"), sticky "Open" and "Save a copy" buttons kept as a backup.
- Works inside WhatsApp/Gmail in-app browsers, where native PDF embedding does not.
- Used by both the staff reading step and the emailed signed-contract link, so both behave the same.

### Errors that recover instead of blocking
- Automatic retry (3 attempts, growing delay) on momentary load failures.
- Clear message per cause: link expired, needs sign-in, file missing, network problem — each with the right next step, plus a reference code and an audit entry so a repeat is traceable.
- A "Try again" button that reloads without losing the reading position.
- Manager side: a contract whose signed file failed to build shows a "Rebuild signed copy" action rather than staff hitting an error.

## Options for you to choose

**Reader technology** (I recommend A):
- **A. Render pages in the app** — the phone downloads the PDF once and draws every page. No new server work, works offline-ish, ~1s slower on long contracts.
- **B. Server turns the PDF into images** — fastest on old phones, but adds a processing step and stores extra images per contract.
- **C. Keep the simple embed, just fix the version** — smallest change, but phones will still often show one page only.

**Emailed signed contract** (I recommend 1):
- **1. Link opens the scrolling reader** (as now, but readable) with Download alongside.
- **2. Attach the PDF to the email as well** as linking — convenient, but the file then lives in inboxes outside the audit trail.
- **3. Link only, no attachment, download-first screen.**

## Technical notes
- `src/pages/DocumentView.tsx`: default `variant` removed; new `<PdfReader>` component (pdfjs-dist canvas rendering, lazy per page); retry-with-backoff fetch; typed error states.
- `supabase/functions/serve-document/index.ts`: unknown/missing variant → `original`; `variant=final` with no `final_signed_pdf_url` → 409 plus `fallback: "original"` so the client can offer the unsigned copy clearly labelled; add `Accept-Ranges`/ETag for repeat loads.
- `supabase/functions/sign-contract/index.ts`: reading-step `document_url` gains `&variant=original`.
- `src/pages/SignContract.tsx`: reading step uses `<PdfReader>` instead of a raw iframe; read-confirm checkbox unchanged.
- Signing gates, tokens, signature capture, audit logging and the manual-send rule are untouched.
- Tests: version-resolution and fallback unit tests added to the existing contract regression suite; full suite plus build check before I report back.
