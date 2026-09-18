# Stop re-asking for an address we hold, and stop asking for a phone number

## What went wrong

For Pyae Hmue Pan Pan the address you typed when creating the contract — "8 Pages Mews, SW11 5EH" — was saved with the contract record itself, not into the staff details area. The check that decides what to ask only looks at the staff details area, which was empty for this person, so it treated the address as missing and asked for it again.

The mobile number is also being asked for even though the contract does not need it.

## What changes

1. Before asking anything, the address is looked for in every place we hold one for that person: the staff details area, and the details saved with their contract when it was created. If either holds an address, it is never asked for again.
2. The mobile number is removed from the contract link entirely — it is no longer asked for or required. Phone numbers are still collected only through a staff details request you choose to send.
3. With address and phone resolved, someone whose name, date of birth and address are all held sees no details step at all — the contract opens straight away.
4. Stored values stay hidden: nothing held is shown back on the page beyond the person's name, and nothing personal goes by email.

## Pyae's link

His existing link currently shows the address question. After the change, the same link will find the address held on his contract and skip straight to the contract. Nothing is re-sent and no record is changed.

## Technical notes

- `supabase/functions/sign-contract/index.ts`, details-first gate: extend the `known` map so `address` also resolves from `employee_documents.terms_snapshot -> variables -> homeAddress` (and `employee_onboarding_data` as today). Drop `phone` from `requiredKeys`.
- `src/pages/SignContract.tsx`: remove the `phone` entry from `DETAIL_FIELDS` (keep `phone` in `NON_DISCLOSABLE_KEYS`).
- No schema change, no email sent, no contract regenerated, existing signed records untouched.
- Update the affected tests (`src/test/phase-contract-flow-redesign.test.ts` and the contract-privacy tests) to reflect the three-field required set and the contract-snapshot address source.
