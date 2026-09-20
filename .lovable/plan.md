# Why Franki is being asked for his home address

## What I checked on his record

- Franki Lee Templeman's contract was created on 18 September and his home address **is** held with it.
- His **date of birth is not held anywhere** — there is no staff details record for him at all.

## What is actually happening

Because the date of birth is missing, the link correctly shows a short details step before the contract. It asks him for the date of birth only — the address is not asked for, exactly as intended.

The problem is what happens when he presses continue:

1. The page itself still checks all three details (name, date of birth, **home address**) even when it only asked for one. The address box is not on screen, so the page reports "Please complete: Home address" with nothing he can fill in.
2. Behind that, the save step still insists on a home address **and a telephone number** — the telephone was supposed to have been dropped entirely.

So the address is held, but two leftover checks refuse to let him past. Nothing is wrong with his record other than the missing date of birth.

## What I will change

1. The page only checks the details it actually asked for. Anything already held is never demanded again.
2. The save step requires only what it asked for, and no longer requires a telephone number at all.
3. Held values stay hidden — the address is not shown back to him, only used.
4. Franki's existing link keeps working: after the change he is asked for his date of birth alone, and then goes straight to the contract. Nothing is re-sent, no email goes out and no record is altered.

Optional, your call: if you would rather he is not asked anything, add his date of birth to his staff record first and the step disappears by itself.

## Technical notes

- `src/pages/SignContract.tsx` — `submitDetails` validates against the asked set (`fieldsToAsk` / `missing_fields`) instead of all of `DETAIL_FIELDS`.
- `supabase/functions/sign-contract/index.ts` (`action: "submit_details"`) — `required` becomes the same three-field set minus anything already resolved, and `phone` is removed; the details-first gate is already correct (address resolves from `terms_snapshot.variables.homeAddress`).
- Redeploy the signing function after the change; update `src/test/phase-contract-flow-redesign.test.ts` to cover "asked-only validation" and "no phone required".
- No schema change, no email sent, no contract regenerated, no signature or status touched.
