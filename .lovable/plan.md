# Stop invitations landing on the wrong person

## What actually happened

Two staff records share the same email address `lotannamoore1@gmail.com`:

- **Lautasha Runakowashe Chipindu** — leaver, created 24 Aug, holds Lotanna's email by mistake
- **Lotanna Oyokomino Moore-Okoli** — onboarding, created today

The joining link and the details request identify the person **by email address only**.
With two records on one address it simply takes the first one it finds, which was the old
leaver. So the address was right and the name was wrong. Nothing else was corrupted —
Lotanna's invitation is still waiting and no details have been submitted yet.

## The fix (three parts)

### 1. Tie every invitation to one named staff record
Each invitation stores the staff record it was created for. The joining link then shows that
person's name — never a name guessed from the email address. Where an old invitation has no
record attached, the link only matches **current** staff (never leavers or archived records),
and if more than one could match it stops and asks you to sort it out instead of guessing.

### 2. Block one email address being used twice
Today a duplicate email is only a warning. Going forward:

- Same email already on a **current** staff record → blocked, with a link to that record.
- Same email on a **leaver or archived** record → allowed, but you are told which record
  holds it and offered "Move the email to the new record" in one click, so the old record
  stops answering for that address.
- Before the invite is sent you see a short confirm step: **name, email, department** side by
  side, so a mismatch is visible before anything leaves the building.

### 3. A place to see who was invited
A new **Invitations** view in People showing, for every invite:

- who it was for (staff name) and the email it went to
- when it was sent, who sent it, when it expires
- status: waiting, opened, joined, expired, cancelled
- **Send reminder** (same link, reminder wording), **Send new link** (replaces the old one),
  and **Cancel invitation**

Reminders and new links stay manual — nothing sends itself.

## The existing mix-up

I will not touch Lautasha's or Lotanna's records without your say-so. My recommendation:
remove the email from the leaver Lautasha record (it was never hers), keeping the change in
the audit trail, then resend Lotanna's link so it shows his own name.

## Technical notes

- Migration: `employee_id uuid` on `tenant_invitations` (nullable, FK to employees), plus a
  partial unique index preventing two live invitations for the same email in one tenant.
  Backfill existing rows where exactly one current staff record matches the email.
- `accept-invitation`: resolve by `employee_id` first; fall back to email restricted to
  non-leaver, non-archived, non-test records; return an `ambiguous_record` error rather than
  picking one. Same rule for the details-request creation inside it.
- `InviteEmployeeDialog` / `useSendInvitation`: pass `employee_id`, hard-block current
  duplicates via `src/lib/duplicate-check.ts` (extended with a `blocking` flag; warn-only
  behaviour kept for archived/leaver matches).
- New `src/components/employees/InvitationsPanel.tsx` + `useInvitations` extended with
  employee join, status derivation and a `useSendInvitationReminder` mutation (reuses the
  existing token, no rotation) alongside the existing `useResendInvitation`.
- Tests: `src/test/phase-invitation-identity.test.ts` — record-first resolution, refusal on
  ambiguity, leaver exclusion, duplicate blocking, reminder keeps the token.
- Untouched: payroll, holiday, contracts, compliance, scheduling logic.
