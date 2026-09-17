# Invited staff join with a personal link — not the business setup

## What went wrong

The invite email sends the person to the ordinary sign-in page. Nothing ties their new account to your company, so the app treats them as a brand-new business owner and shows the 7-step company setup: workspace name, workplace address, how the team operates, team size, pay cycle, inviting other people. A staff member should never see any of that, and the wrong answers there could create a second empty company.

## How joining will work instead

1. You invite the person as you do today.
2. Their email contains a link that is personal to them and expires. It cannot be reused by anyone else.
3. Opening it shows: "You've been invited to join Ugly Dumpling" with their name, and a box to choose a password.
4. As soon as the password is set, their access to your company is created automatically — no setup questions, ever.
5. They are taken straight to a short form asking only what we need.
6. When they submit, they see a simple "All done — thanks" page. Nothing else opens up until you give them access.

## What the form asks for (nothing more)

- Full legal name, date of birth, phone, home address
- Right to work in the UK: nationality, share code, and a photo or file of their document
- Bank details for pay: account holder name, sort code, account number

Same rules as the existing details link: their answers file themselves onto their staff record so you never type them twice; anything sensitive that you already hold is never overwritten — a difference shows up as "Details to confirm" for you to accept or keep. Right to work stays pending your review.

## What is removed for staff

- The company setup wizard becomes unreachable for anyone arriving from an invitation.
- Someone who signs in with no company and no valid invitation sees "Ask your manager for an invitation" instead of business setup.
- Only a person creating a genuinely new business can reach the setup wizard.

## Technical notes

- New public route `/join/:token`, plus an edge function that validates the `tenant_invitations` token (unused, unexpired, email match), creates the account, inserts the `tenant_members` row with the invited role, links the matching `employees` row (reusing `link_user_to_employee`), and stamps `accepted_at` / `status = accepted`. Token single-use; audit-logged.
- Invite email in `useInviteEmail` switches from `/auth` to `${origin}/join/{token}`.
- After joining, redirect to a staff-scoped details form that reuses the existing allocation engine (`staff-details-allocation.ts`) and the right-to-work upload path, so no new data rules are introduced.
- `CompanyOnboarding` guard gains an invitation check: pending invitation → redirect to `/join`; no membership and no invitation → an "invitation needed" screen.
- No changes to payroll, holiday, scheduling or compliance logic. No schema changes beyond what already exists on `tenant_invitations`.

## Checks

- Invited person: link → password → details form → done page, with no company setup screen reachable.
- Expired, already-used and wrong-email links each refused with a clear message.
- A genuine new business can still complete setup.
