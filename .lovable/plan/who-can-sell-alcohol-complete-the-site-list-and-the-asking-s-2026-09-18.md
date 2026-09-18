# Who can sell alcohol — complete the site list and the asking step

## What you get

**1. Every front-of-house person is on the site list**

Each site's alcohol list already shows front-of-house staff and anyone who holds an authorisation record. Two gaps get closed:

- The list and the "send to staff" screen judge front of house slightly differently today, so a person could appear on one and not the other. Both use the same rule after this change.
- People with a blank or unclear job title are currently left off silently. They now appear in a separate **"Role not clear — decide"** group above the list, each with a one-tap "Add to the alcohol list" or "Not front of house". Your choice is remembered and recorded, so nobody is quietly missing from an inspection copy.

**2. You decide when anyone is asked**

Nothing is sent automatically and no reminders are added. Before anything goes out you see a confirmation step listing each person's name, role and the exact email address it will go to, with a count and a clear "Send to these N people" button. Anyone without an email address is listed as "cannot be sent — no email address on file" rather than silently skipped.

**3. A name only joins the authorised list when they confirm**

Unchanged in how it works, but made plain on screen: a person becomes "Authorised" only after they have read and signed the authorisation themselves and the DPS or personal licence holder has approved it. Until then they read "Awaiting signature" or "Signed — awaiting licence holder". The system never authorises anyone.

## Technical notes

- `src/lib/alcohol-automation.ts`: `isFrontOfHouse` keeps its word lists; add `classifyRole(job_title, department)` returning `front_of_house | back_of_house | unclear` so a blank/unmatched title is explicitly unclear rather than false.
- `src/lib/dps-register.ts`: `buildDpsRegister` uses `classifyRole`; new `unclassified` result listing site staff whose role is unclear and who hold no authorisation record. `listed_because` gains `"manager_added"`.
- Manager decisions stored per employee and site in a new small table `alcohol_list_decisions` (tenant_id, employee_id, branch, decision, decided_by, decided_at, note), tenant-scoped RLS, admin/manager write, plus a compliance audit event. Decisions override the word-list guess in both the register and the send screen.
- `src/components/compliance/SendStaffAlcoholDialog.tsx`: pass `job_title` as well as `department` to the FOH check; add a second dialog step (recipient review) before `send.mutateAsync`; keep the existing test-send switch.
- `src/components/compliance/AlcoholAuthorisationBoard.tsx`: render the "Role not clear — decide" group and the plain-English authorisation note.
- Tests extend `src/test/phase-dps-register.test.ts`: unclear roles never counted as authorised, manager decision puts a person on the list, sending requires the confirmation step, no send path bypasses selection.

## Not included

No emails or reminders are sent as part of this work, no existing authorisation record is changed, and no record status is altered.
