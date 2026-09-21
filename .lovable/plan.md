# Simplify the licence step on Philipp's signing page

He already knows the difference between his own licence and the premises licence, so the
explanation comes out and a short confirmation appears just before he signs and submits.

## What changes on his page

1. **Licence step wording trimmed** — the paragraph explaining "this is your own personal
   licence, not the premises licence" is replaced by one short line: the number and council are
   printed on the authorisation so a licensing or police officer can check them.
2. **Confirm before submitting** — on the final signature step, a small summary box shows the
   licence number, issuing council and the sites the authorisation covers, with a tick box
   "I confirm these details are correct". The **Sign and submit** button stays disabled until the
   signature is drawn and the box is ticked.
3. **Easy correction** — a plain "Change these details" link in that box takes him back to the
   licence step, keeping what he already typed.

Nothing else on the page moves: reading step, optional licence photo, audit recording of name,
signature, timestamp and device all stay exactly as they are.

## Technical notes

- Only `src/pages/SignLicensingDocument.tsx` is edited.
- Remove the long paragraph at the top of the `licence` step; keep both inputs and the file field.
- In the `sign` step, add a read-only summary block rendering `licenceNumber`,
  `licenceAuthority` and the request's covered sites, plus a local `detailsConfirmed` state
  driving the disabled condition on the submit button (`busy || !signature || !detailsConfirmed`).
- The "Change these details" action calls `setStep("licence")`; existing state already persists.
- No database, email, or document-template changes. Nothing is sent.
