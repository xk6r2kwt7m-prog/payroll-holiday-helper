# Repair staff invitation resend and recovery

## What will change
- Make **Resend invite** create a fresh, single-use joining link and invalidate the previous unused link instead of emailing the same token again.
- If an account already exists, do not claim the person chose a password. Show that access exists and offer a clear **Sign in** or **Reset password** route.
- Keep invitation acceptance idempotent: retrying after account creation cannot create duplicate accounts, memberships, staff links, or personal-information requests.
- Show managers the correct action for each state: **Resend invite** while pending, **Send new access link** if setup needs restarting, and no misleading resend after successful access.
- Record link replacement in the audit trail without deleting the earlier invitation history.

## Safety rules
- New links remain tenant-scoped, time-limited, and single-use.
- Creating a replacement link will not change payroll, holiday, scheduling, contracts, or compliance data.
- Existing staff records and submitted personal information remain untouched.

## Verification
- Add regression checks for token rotation, invalidation of the old link, account recovery wording, and duplicate prevention.
- Test the published-style phone flow: old link gives a truthful replacement message; new link opens setup; repeated acceptance remains safe.
- Deploy the corrected joining service and confirm the app build is clean.
