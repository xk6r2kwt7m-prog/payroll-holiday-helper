# Simplify the Allergen Training tab into one decision panel

## Goal
The allergen training tab currently has ten tabs (Pilot, Walkthrough, Lessons, Questions, Practical sign-off, Version 1 vs 2, Learner preview, Acceptance, Hands-on checklist, Assignments & certificates). Replace that with one simple, organised panel that answers, in order: **Is the course ready? → Who should take it? → Send the link.**

## What you will see

One screen, top to bottom:

1. **Course status** — one line: draft / approved / published, plus the outstanding evidence note (Tempura Aubergine, Corn Fritters) if still open.
2. **Approve & publish** — the approval step (type your name) and the Publish button, side by side. Publishing never contacts staff.
3. **Who should take the course** — the full list of front-of-house and kitchen staff, grouped by site (Carnaby, Brixton, Fitzrovia), each with a checkbox. Each person shows: name, role, site, and their current state — *Not sent*, *Link sent*, *In progress*, *Completed* — so you can see at a glance who still needs it. Anyone without an email address is flagged and cannot be ticked.
4. **Send** — optional "complete by" date, then one **Send course link** button. One email per person, first name and link only, no reminders. Every send or failure is recorded.

Everything else (lessons, questions, walkthrough, previews, checklists, version comparison, certificates) moves behind a single collapsed **"Review & test the course"** section at the bottom — still there, but out of the way.

## What stays exactly the same
- No staff are contacted unless you press Send.
- The course stays unpublished until you approve and publish it yourself.
- Automatic reminders stay off.
- No existing assignment, completion, certificate or historical record is changed.
- Test staff remain excluded from the recipient list.

## Technical notes
- Rework `AllergenCourseWorkbench.tsx`: remove the ten-tab layout; new default view is a single-column panel reusing the existing pieces — status banner, `AllergenPilotControl` approval/publish logic, and the `useCourseRecipients` / `useSendAllergenCourseEmail` recipient list — merged into one recipient table with per-person status from `allergen_assignments`.
- The nine review tabs move into one collapsible section (existing components reused unchanged, no logic edits).
- No database changes; no new email types; the existing `training_course_link` email is reused.
- Tests: recipient list shows correct per-person status; send button disabled until published; staff without email cannot be selected; nothing sends without the button.
