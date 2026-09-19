# Keeping contracts in step with corrected staff details

## What's happening now

Rheana Rahman's record is corrected, but her contract document was produced on 18 September under the old spelling ("Rheana Rahim") and still shows it. That contract has **not been signed yet** — it was sent out and is awaiting signature. Nothing links a corrected staff record back to a contract that was already produced, so the wrong spelling simply stays.

## The rule this follows

- A contract that **nobody has signed** is still paperwork in progress — it can be corrected and reissued.
- A contract that **has been signed** is never reworded or reproduced. A correction there is recorded as a dated correction or variation alongside it, with the signed copy left exactly as it is.

## What I'll build

### 1. A change notice on each contract

Each contract is compared against the details we hold today (name, job title, start date, pay, hours, site, manager). Where they differ, the contract shows a plain line for each one, for example:

```text
Name on this contract:  Rheana Rahim
Name on file now:       Rheana Rahman
```

No wording is touched automatically — the notice only tells you what no longer matches.

### 2. For unsigned contracts: "Correct and reissue"

One button. It produces a fresh copy of the same contract carrying the corrected details, records it as the next version of that contract, and keeps the earlier copy in the history marked as replaced (never deleted). Because the earlier copy was already emailed, the screen reminds you that the person still holds a link to the old version and lets you decide whether to send the corrected one — nothing is emailed unless you press send.

### 3. For signed contracts: a dated correction record

No new PDF over the top of a signed one. Instead you record a correction ("name corrected from … to …, on … , reason …"), which appears in the contract's history and prints on the signing certificate. If the change is substantive rather than a spelling fix, the screen points you to the existing dated variation process instead.

### 4. "Edit contract details" for unsigned contracts

An edit panel on any unsigned contract letting you correct what appears on it — name, job title, start date, hours, pay, site, reporting manager — showing what we hold on file beside each field so you can pull the correct value across in one tap. Saving produces the corrected version through the same reissue step above, and every field changed is written to the audit trail with who changed it and when. Signed, superseded and terminated contracts have no edit panel at all.

## Deliberately not included

- No automatic rewriting, restamping or reformatting of any contract.
- No change to signed, superseded or terminated files, their wording, statuses or signatures.
- No emails, links or reminders sent by the system — every send stays a separate press by you.
- No deletion of superseded drafts.

## Technical notes

- New comparison helper reads the contract's stored `terms_snapshot` against the current `employees` / `employee_contract_terms` values and returns per-field differences; used by both the notice and the edit panel's "on file" hints.
- Reissue writes a new `employee_documents` row in the same `root_contract_id` chain with the next `version_number`, sets the previous row to a replaced state, and writes an `audit_log` entry plus field-level `employee_changes`.
- Signed-contract corrections are stored as a `contract_amendments` row of a correction type, surfaced in `ContractVersionTimeline` and on `SigningCertificatePDF`; no file is regenerated.
- Edit panel gated on contract state not in (`signed`, `superseded`, `terminated`) and on administrator permission via the existing permission check.
- Tests: mismatch detection, edit blocked for signed states, reissue preserves the old file and chain, no send-notification call on any of these paths.
