# Contract link: stop showing held details back, and stop asking for extras

## What I found

The email itself is clean — contract emails contain only a first name and the secure link (this is enforced by tests). The problem is on the page the link opens, shown in your screenshot:

1. **It displays details we already hold back at the person** — Iara's date of birth and full National Insurance number are printed on screen under "Already on file". That was added so people could check their details were right, but it means the secure link discloses sensitive data that the person never needs to see, and that anyone holding the link could see.
2. **It asks for things a contract doesn't need** — emergency contact name and number are asked whenever they are blank, even though they are not required to issue or sign a contract.

For Iara specifically, home address and mobile really are blank on her record (she has no submitted personal details yet), so asking for those two is correct. Her date of birth and NI number are on her employee record — which is why they appeared.

## What changes

- **"Already on file" no longer shows sensitive values.** Date of birth and National Insurance number are removed from that panel entirely. The panel keeps only the person's name so they can confirm the link is theirs, with the line: if anything is wrong, tell your manager.
- **Only genuinely required missing details are asked.** For a contract that is: full legal name, home address, mobile number, date of birth. Emergency contact fields are no longer requested on the contract link — they are collected through the staff details request flow instead, where you choose them deliberately.
- **A single rule, documented in one place**, covering both the emails and the signing page: never disclose held personal data, never ask for anything outside the required contract set.
- **Tests** that fail if the signing page ever renders a date of birth, NI number, bank detail or address value it already holds, and that fail if a non-required field is added back to what the link asks for.

## Not changed

No signed contract, PDF, record status or wording is touched. No emails are sent. Iara's existing link keeps working; it will simply show less.

## Technical notes

- `supabase/functions/sign-contract/index.ts`: `on_file` in the `details_required` response is reduced to non-sensitive keys (`full_name`); `prefill` stops returning `date_of_birth`, `national_insurance`, and emergency fields to the browser. `missingFields` logic stays as-is (required keys only).
- `src/pages/SignContract.tsx`: `DETAIL_FIELDS` limited to the required contract set; the "already on file" panel renders only non-sensitive labels; the optional-field branch in `fieldsToAsk` (`!f.required && !onFileKeys.has(f.key)`) is removed.
- New assertions in `src/test/contract-email-privacy.test.ts` plus a guard on the sensitive-key list.
- `sign-contract` redeployed after the change.
