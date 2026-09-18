# Sharing the Allergen Training & Exam link with staff

## What exists today

- The governed course (Ugly Dumpling Allergen Safety, version 2) is **not published** and has **no staff-facing page**. The learner reader only exists inside the management workbench as an isolated preview.
- The only staff-reachable allergy page is the old static `/foh/allergy` guide — it is not the course, has no progress saving, no assessment and no certificate. It stays untouched.
- Because there is no staff page, there is currently **no link to share**. Sharing requires three things, in this order: publish version 2, give staff a course page, then give you a link to hand out.

## Proposed build

### 1. Staff course page (the thing the link points to)
- New signed-in staff page, e.g. `/training/allergen-safety`, using the existing learner reader, progress saving, assessment, coaching lock and certificate gates — the same components already tested in the management preview.
- Access rules:
  - Only staff with an active assignment for the published version can open it.
  - Anyone else (no assignment, course unpublished, wrong tenant) sees a clear "This training has not been assigned to you yet" message — never an error page or someone else's data.
  - Test staff and test sessions remain fully isolated from genuine records.

### 2. A shareable link, under your control
- The link uses the canonical address (`https://udp.lovable.app/training/allergen-safety`) — never a preview or editor URL.
- A "Share training link" control in the management workbench that simply **copies the link** so you can paste it into your own message (WhatsApp, email, printed notice).
- **No automatic sending.** No emails, notifications or reminders are triggered. You decide who gets the link and when, matching your standing rule that the system never contacts staff without your specific approval.

### 3. Assignment still gates access (important safeguard)
- Sharing the link alone does not grant access: a staff member still needs an assignment (created by you, e.g. the three-person pilot already prepared as "Pilot — Not sent").
- This means you can share the link widely and only the people you assigned can actually start — everyone else gets the polite "not assigned" message.

## What this does NOT do
- Does not publish version 2 — that stays a separate button awaiting your approval.
- Does not send anything, create assignments, issue certificates or activate reminders.
- Does not change version 1, existing assignments, certificates or historical records.
- Does not touch the static FOH allergy pages.

## Order of operations when you're ready
1. You approve this build → staff page + copy-link control exist (course still unpublished).
2. You complete the phone + computer walkthroughs → version 2 becomes ready.
3. You press **Publish** (no staff contact happens).
4. You approve the pilot assignments → you copy the link and send it yourself.

## Technical notes
- Reuses `AllergenLessonReader`, assessment and certificate components; new route guarded by existing `ProtectedRoute` + assignment check.
- Link origin via the existing canonical-URL helper (preview/localhost blocked).
- New tests: unpublished course blocked, unassigned staff blocked, assigned staff can open, test isolation intact.
