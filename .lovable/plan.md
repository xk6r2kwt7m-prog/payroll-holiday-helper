## Schedule Tab Improvement — Build Shift + Load Template, Smart Assignment, Week State, Warnings, Auto-fill

This plan keeps the work scoped to **UI + pure presentation helpers**. No payroll, timesheet, holiday, employee profile, contract or DB schema changes. Existing dialogs (`LoadTemplateDialog`, `CopyPreviousWeekDialog`, `SaveTemplateDialog`, `ComplianceWarnings`) are reused.

### What changes

1. **Header CTA pair (`ScheduleHeader.tsx`, `Schedule.tsx`, `MobileManagerBar.tsx`)**
   - Promote **Load Template** to a primary action sitting next to **Build Shift** on both desktop header and mobile manager bar.
   - Keep the overflow menu options as a backup (Copy previous week, Save template, etc.).
   - Empty-state CTA gets two buttons: **Build Shift** + **Load Template** (and a tertiary "Copy last week" link).

2. **Load Template flow (`LoadTemplateDialog.tsx`)**
   - Convert dialog into a two-step picker with the six requested options:
     - Load full site template
     - Load FOH template
     - Load BOH template
     - Load CPU template
     - Load last used template (read from `localStorage` per tenant+branch)
     - Load from another week (opens an inline week-picker → uses existing copy-week mutation)
   - Department-scoped options filter the saved-template list by `department`. Full-site loads templates with `department = "All"` or aggregates.
   - All loaded shifts are written as `is_published = false` (already the case in `useLoadTemplate`).

3. **Smart auto-assignment helper (`src/lib/schedule-auto-assign.ts`, pure)**
   - New pure function `suggestAssignmentForShift(shift, ctx)` returning either an `employeeId` or `unassigned` with reasons.
   - Inputs (all passed in — no Supabase/React imports): candidate employees, their availability slots, approved leave ranges, contracted weekly hours, existing same-week shifts.
   - Hard exclusions: inactive, on approved leave, marked unavailable for that day/slot, overlapping shift on the same day, wrong department/site/role.
   - Soft scoring: prefer matching role, prefer lower current-week assigned hours vs contracted hours.
   - Returns `{ employeeId | null, reasons: WarningCode[] }`. Never assigns when unsafe — falls back to unassigned + warning.

4. **Copy last week & template loading wired to helper**
   - In `useScheduleActions.handleCopyPrevWeek` and the load-template path, after server-side copy returns the new rows, run a **client-side reassignment pass** that:
     - Keeps assignments where the candidate is still safe.
     - Clears assignments that fail safety checks and emits a per-shift warning.
     - Never overwrites existing shifts in the target week without a confirmation toast/dialog (this is already handled by `CopyPreviousWeekDialog`'s warning; we make it a true block requiring explicit "Add alongside" confirmation).
   - Result starts as **Draft** (unpublished). Publishing remains an explicit, separate action.

5. **Week state badge (`src/lib/schedule-week-state.ts`, pure + `ScheduleHeader`)**
   - Pure helper `getScheduleWeekState({ shifts, warnings })` returns one of:
     - `not_started` — 0 shifts
     - `draft` — has shifts, none published
     - `needs_attention` — has any critical warning or unassigned shift in a published-ready week
     - `ready_to_publish` — has shifts, none published, no critical warnings, all required slots covered
     - `published` — all shifts published
   - Header shows a small coloured pill rendering the state label.

6. **Tappable warning panel (`src/components/schedule/RotaIssuesPanel.tsx`, new) + warnings helper (`src/lib/schedule-rota-issues.ts`, pure)**
   - Helper aggregates rota issues across the week (unassigned shifts, employee unavailable, employee on leave, missing role, over contracted hours, overlapping shift, missing break, insufficient FOH/BOH/CPU cover).
   - Reuses existing `useComplianceWarnings` rest/weekly-hours output, merges with new structural issues.
   - The existing red badge becomes a button opening `RotaIssuesPanel` (Sheet/Popover) listing actionable items grouped by type with day + shift link.

7. **Auto-fill gaps (`src/components/schedule/AutoFillGapsDialog.tsx`, new)**
   - Triggered from the new "Auto-fill gaps" menu item (visible when draft + has unassigned shifts).
   - Uses `suggestAssignmentForShift` for every unassigned shift in the visible scope.
   - Shows a table: shift → suggested employee → reason → checkbox.
   - Manager confirms; only confirmed rows are applied via existing `bulkUpdate` mutation. Nothing applied automatically.

8. **Safety guarantees (enforced by helpers & code review)**
   - No publish trigger.
   - No staff notifications sent from template/copy/auto-fill paths (only existing publish path notifies).
   - No mutation of payroll, holiday, contract, profile, or timesheet tables.
   - No DB migrations.
   - Existing shifts in target week are never deleted/overwritten silently.
   - Inactive / on-leave / unavailable / overlapping employees are filtered out before suggestion.

### Tests (`src/test/phase-schedule-improvements.test.ts`, new)

Single suite covering pure helpers + minimal render smoke for the header. No new e2e.

- Header: "Load Template" button appears next to "Build Shift" for users with edit permission.
- Empty state: both buttons render when no shifts exist.
- `LoadTemplateDialog` renders the six options; selecting FOH only lists FOH templates; same for BOH/CPU; full-site shows all.
- `suggestAssignmentForShift`:
  - skips inactive employees → returns `null` + reason `inactive`
  - skips employees on approved leave → reason `on_leave`
  - skips unavailable employees → reason `unavailable`
  - skips employees with overlapping shift → reason `overlap`
  - prefers role match
  - returns `null` when no safe candidate
- Copy/load flow: results have `is_published === false` (Draft).
- Copy flow: never overwrites an existing shift in target week (asserts existing shift untouched, new shift added alongside only after confirmation).
- `getScheduleWeekState`: returns correct state for each fixture (`not_started`, `draft`, `ready_to_publish`, `needs_attention`, `published`).
- `aggregateRotaIssues`: returns expected issue types for fixture shifts.
- Warning panel: clicking the badge opens the panel and lists the issues.
- `AutoFillGapsDialog`: only suggests safe employees; nothing is applied until manager confirms.
- Purity check: the three new `src/lib/` files import nothing from `react`, `@tanstack/react-query`, or `@/integrations/supabase`.

### Files

Created
- `src/lib/schedule-auto-assign.ts`
- `src/lib/schedule-week-state.ts`
- `src/lib/schedule-rota-issues.ts`
- `src/components/schedule/RotaIssuesPanel.tsx`
- `src/components/schedule/AutoFillGapsDialog.tsx`
- `src/test/phase-schedule-improvements.test.ts`

Edited
- `src/components/schedule/ScheduleHeader.tsx` (add Load Template primary button, week-state pill, wire issues badge)
- `src/components/schedule/LoadTemplateDialog.tsx` (add department + last-used + from-another-week options)
- `src/components/schedule/MobileManagerBar.tsx` (promote Load Template alongside Build Shift)
- `src/components/schedule/CopyPreviousWeekDialog.tsx` (require explicit "Add alongside existing" confirmation when target week already has shifts)
- `src/hooks/useScheduleActions.ts` (run client-side safety reassignment after copy/load; clears unsafe assignments and surfaces warnings — no payroll/holiday/contract calls)
- `src/pages/Schedule.tsx` (render new buttons in empty state, mount `RotaIssuesPanel` and `AutoFillGapsDialog`)

### Not in scope

- Backend schedule schema, RLS, edge functions
- Payroll, timesheet, holiday, contract, employee-profile logic
- Automatic publishing or staff notifications
- New tenant-template content (existing tenant templates are reused)
- E2E Playwright suite changes (existing `e2e/schedule.spec.ts` remains)
