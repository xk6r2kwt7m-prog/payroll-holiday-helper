# Joining without a password: step-by-step details, then a check screen

New staff who receive an invitation no longer choose a password or sign in. The link takes them straight into a short guided form — two or three questions per screen — and ends with a check screen where they can correct anything before sending.

## What the staff member sees

1. **Welcome** — "Welcome, {first name}. {Company} needs a few details before you start. It takes about 3 minutes." One button: Start.
2. **Guided screens** (2-3 questions each, big buttons, progress bar):
   - Your name (first name, surname, name you prefer)
   - Date of birth and mobile number
   - Email address (prefilled, they confirm or correct)
   - Home address (address, line 2, town, postcode)
   - Right to work: nationality, immigration status
   - Right to work document: photo or file (required), passport number / share code
   - Bank details: account holder name, sort code, account number
   - National Insurance number (can be left blank)
3. **Check your answers** — everything they entered in one list, grouped by heading. Tapping any answer opens it for editing on that screen, no jumping back and forth. The right-to-work photo shows as a thumbnail with "Replace".
4. **Send my details** → "All done, thank you" with a short note that their manager will check their document.

Progress saves as they go, so closing the page and reopening the link resumes where they left off. Once sent, the link closes and cannot be reopened.

## Rules kept exactly as they are

- No login or password is created from this link. You give app access later from their staff record ("Send new link" / invitation), which still works as it does now.
- Right to work stays **pending your review** — it is never auto-approved.
- Sensitive values (legal name, date of birth, NI number, bank details, email) only fill in blanks; anything that differs from what you already hold appears as "Details to confirm" on their record for you to accept or keep.
- Single-use, expiring link; cancelled/finished links say so.
- No changes to payroll, holiday, scheduling, contracts or compliance logic.

## Technical notes

- `src/pages/JoinTeam.tsx`: remove the password fields and the `signInWithPassword` call. GET stays as-is; the page requests the details form and forwards to it.
- `supabase/functions/accept-invitation/index.ts`: accept `POST { token }` with no password. New behaviour when no password is supplied: **do not** create an auth user, `tenant_members` row or `user_roles` row. Only stamp the invitation as accepted (`accepted_at`, `status = "accepted"`), reuse or create the `employee_info_requests` record (sections `personal`, `rtw`, `bank`), audit-log `invitation_details_started`, and return `details_token`. The existing password path is retained for future use but no longer called from the join page, and existing membership roles are still never downgraded.
- `src/pages/StaffDetailsPortal.tsx`: restructure the wizard from 3 section screens into ~8 small step screens driven by a step definition array (fields per step + validation), derived from the request's `sections` so a manager-created request asking for fewer sections still works. Add an `emergency` step only when that section is requested (unchanged behaviour).
- Add a final `review` pseudo-step: renders all answered fields with inline editing (same `Field` component, toggled per row) plus the uploaded document thumbnail; "Send my details" calls the existing `action: "submit"`. `action: "save"` continues to autosave on every step change.
- Missing-field validation moves per-step; the existing NI-optional and required-RTW-upload rules stay.
- No database schema change. No change to `staff-details-portal` submit/allocation logic (`allocation.ts` untouched, so the byte-identical copy test still passes).
- Tests: extend `src/test/phase-staff-invitation-join.test.ts` for the no-password acceptance path (no membership created, invitation stamped, details token returned) and add step/validation/review coverage for the wizard.
