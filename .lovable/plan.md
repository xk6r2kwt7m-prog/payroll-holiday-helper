# Asking existing staff for information

A separate, clearly labelled way to ask people already on the team for specific things — a visa or share code, home address, email, phone, bank details, emergency contact — without touching the new-starter joining flow.

## Kept completely separate from new starters

Two different journeys, never mixed:

- **New starter joining** — invitation link, welcome screen, full set of details, first-time setup. Unchanged.
- **Existing staff update** — a short "we need a couple of things from you" link. Only the items you ticked appear, their answers are compared with what is already held, and nothing about joining, passwords or access is mentioned.

Requests are tagged as one kind or the other, so the tracking lists, emails and wording stay distinct and reporting never blends them.

## Choosing exactly what to ask for

Instead of only the four fixed groups, you tick individual items:

- Identity: legal name, date of birth, nationality, National Insurance number
- Contact: email address, mobile number, home address
- Right to work: passport, visa / residence permit, share code — each with its expiry date
- Pay: bank account holder, sort code, account number (asked twice to confirm)
- Emergency contact

Quick presets stay for common cases ("Right to work refresh", "Contact details check", "Bank details"), each just a set of ticks you can change. The staff form only shows the steps for what you ticked, and each request records what was asked.

## Sending to one person or many

- From a staff member's record: **Ask for information**.
- From the People list: select several people and send the same request to all — including a filtered short-cut such as "everyone with no share code" or "everyone whose visa expires in the next 90 days".
- Before sending, a confirm step lists each person and the email it goes to, so a wrong name or address is caught first (same safeguard as invitations).

## Tracking and chasing

A single **Information requests** view shows: who it went to, what was asked, when sent, whether it has been opened, finished or expired, and when last reminded. Actions: **Send reminder** (same link), **Send new link**, **Cancel link**. All manual — nothing sends itself. An automatic chaser is built but left switched off behind a setting you turn on later.

## Expiry tracking

When a visa, residence permit, passport or share code is supplied, the expiry date is stored with the uploaded document. Those items then appear in an **Expiring soon** list (90 / 60 / 30 days and overdue) with a one-click re-request. Right to work uploads still wait for your review before they count as checked — the system never marks anyone as verified on its own.

## Safety rules kept

- Sensitive values (legal name, date of birth, NI number, bank details, email) only fill an empty box; differences appear as "Details to confirm" with both values side by side for you to accept or keep.
- Links are single-use, expire, and close as soon as the person finishes.
- Every save, confirmation and copy is written to the audit trail.
- No change to payroll, holiday, contracts, scheduling or compliance logic.

## Technical notes

- Migration: add `request_kind text not null default 'onboarding'` (`'onboarding' | 'existing_staff_update'`) plus `reminder_count int default 0`, `last_reminder_at`, `preset text`, `cancelled_at` to `employee_info_requests`; existing rows stay `'onboarding'`. Field-level asks continue to live in `requested_fields text[]`, extended from the four section keys to item keys (`legal_name`, `dob`, `nationality`, `ni_number`, `email`, `phone`, `address`, `passport`, `visa`, `share_code`, `bank`, `emergency`) with backwards-compatible expansion of the old keys.
- `employees` has no expiry columns; expiry dates are stored on `employee_documents.expires_at` with the matching `document_type` (`passport`, `visa`, `right_to_work`), so the existing certificate/expiry reminder patterns can read them.
- `supabase/functions/send-info-request` gains `request_kind`, preset handling and bulk confirm payload; email copy varies by kind. `supabase/functions/staff-details-portal` maps item keys to steps (the step list is already derived from `requested_fields`) and writes expiry dates alongside uploads. Allocation keeps using `src/lib/staff-details-allocation.ts` unchanged, including its blank-only rule for sensitive values.
- Frontend: extend `src/hooks/useInfoRequests.ts` (item keys, reminder/cancel mutations, state derivation), rework `RequestStaffDetailsDialog` into preset + item picker with a confirm step, add `InfoRequestsPanel` to People alongside `InvitationsPanel`, add bulk send to `BulkActionsBar`, and an `ExpiringDocumentsPanel` reading `employee_documents.expires_at`.
- Tests: new `src/test/phase-info-requests.test.ts` covering kind separation, item-key expansion of legacy keys, bulk confirm, reminder reusing the token, expiry capture, and the blank-only/confirm rules.
