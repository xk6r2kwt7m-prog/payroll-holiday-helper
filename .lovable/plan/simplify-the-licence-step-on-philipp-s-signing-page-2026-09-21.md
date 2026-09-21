# Simplify the licence step on Philipp's signing page

He already knows the difference between his own licence and the premises licence, so the
explanation and any references to police/licensing-officer checks come out. The step just asks
for his personal licence number and issuing council, professionally and simply, and a short
confirmation appears just before he signs and submits.

## What changes on his page

1. **Licence step wording trimmed** — the paragraph explaining "this is your own personal
   licence, not the premises licence... a licensing officer or police officer can check them" is
   replaced by one short, professional line:
   *"Please enter your personal licence details as they appear on your licence."*
2. **Confirm before submitting** — on the final signature step, a small summary box shows the
   licence number and issuing council, with a tick box "I confirm these details are correct".
   The **Sign and submit** button stays disabled until the signature is drawn and the box is
   ticked.
3. **Easy correction** — a plain "Change these details" link in that box takes him back to the
   licence step, keeping what he already typed.

Nothing else on the page moves: reading step, optional licence photo, audit recording of name,
signature, timestamp and device all stay exactly as they are.

## Technical notes

- Only `src/pages/SignLicensingDocument.tsx` is edited.
- Replace the long paragraph at the top of the `licence` step (lines ~341-345) with the short
  line above; keep both inputs and the file field unchanged.
- In the `sign` step, add a read-only summary block rendering `licenceNumber` and
  `licenceAuthority`, plus a local `detailsConfirmed` state driving the disabled condition on the
  submit button (`busy || !signature || !detailsConfirmed`).
- The "Change these details" action calls `setStep("licence")`; existing state already persists.
- No database, email, or document-template changes. Nothing is sent.
