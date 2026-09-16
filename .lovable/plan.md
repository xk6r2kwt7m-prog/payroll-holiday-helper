# Guided contract flow, staff details first, and a review step

## 1. Step-by-step contract builder

Replace the single long contract form with a guided wizard that asks one thing at a time and remembers what it already knows:

1. **Who is it for** — pick the staff member (search by name).
2. **Where they work** — pick the location/branch (pre-selected if they already have one).
3. **Hours** — Full time or Part time (then weekly hours if part time).
4. **Who they report to** — a short picker of managers, with Aderito Barros (Operations Manager) at the top as a one-tap choice.
5. **Their email** — always shown. If missing, you type it in; if wrong, you edit it. Saved to their record.
6. **Review and send** — a plain summary of the above plus pay details, then "Send for signing".

Anything already on file is filled in for you, so most steps are a single tap. Existing pay/terms fields stay available in the review step so nothing is lost.

## 2. Ask staff for their details before the contract appears

Staff already have a details form (address, full name, date of birth, right to work). New behaviour:

- You choose per contract: "Ask for details first" (default) or "Send straight away".
- If details are requested, the staff member gets a link to complete their information. The contract stays hidden until they submit it.
- Once submitted, their details flow into the contract automatically and the contract becomes visible for them to sign and send back.
- You can see who is still outstanding and chase them.

## 3. Review and accept the signed contract

A new **Awaiting your review** area for contracts staff have signed:

- Open and read the signed document with both signature blocks visible.
- **Accept and countersign** — completes it, stores it safely in the employee's documents, and keeps the full audit trail.
- **Reject / ask again** — with a reason, sending it back for correction.
- After accepting, one button sends the finished copy to the staff member (and you can resend later).

## 4. Email editing everywhere

The staff email is visible on the contract row and in the send box, with an inline edit that saves back to the employee record. Works whether an email exists or not.

## Technical notes

- New `src/components/contracts/ContractWizard.tsx` driving steps over the existing `ContractFormDialog` logic; step state kept in one object, validation per step in a pure helper `src/lib/contract-wizard-steps.ts` with unit tests.
- Reporting-manager picker sources managers from `tenant_members`/`employees` and uses `buildAppointmentReportingSentence` (already exists) for wording.
- Details-first gating: new columns on `employee_documents` (`requires_onboarding_first boolean`, `visible_to_employee_at timestamptz`), additive migration with grants; `SignContract.tsx` shows the details form instead of the contract until `employee_onboarding_data` is submitted, then reveals it.
- Review step: new `ContractReviewPanel` listing documents in `employee_signed` state; accept path reuses the existing employer countersign call, reject writes an audit entry and returns the contract to `sent`.
- No changes to payroll or holiday logic; all contract state transitions stay audit-logged.
