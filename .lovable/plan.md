# Phone-wide visibility and usability pass

## Goal
Make every area available to the signed-in user readable and operable on a phone, without removing functionality or changing any business rules, records, approvals, or communication settings.

## What the current review confirmed
- The application already has the correct phone viewport setting and a dedicated bottom navigation.
- The supplied screenshot shows content being cut off horizontally in induction tabs, descriptions, lesson cards, and the Staff induction introduction.
- Shared dialogs and tables already provide some scrolling, but individual pages contain desktop-oriented tab rows, multi-column layouts, fixed widths, and non-wrapping controls that need a consistent phone treatment.

## Implementation
1. **Fix shared phone foundations**
   - Prevent page-wide horizontal overflow while preserving deliberate scrolling inside tables, schedules, and other wide tools.
   - Make dialogs fit the visible phone screen, account for safe areas and the bottom navigation, and keep close/primary actions reachable.
   - Standardise phone-friendly tabs, buttons, form controls, text wrapping, and minimum touch sizes.

2. **Repair the screen shown**
   - Reformat the Documents & Compliance tabs so every section remains discoverable on a phone.
   - Stack or wrap lesson-card content and actions so titles, descriptions, statuses, completion counts, Preview, and Release/Hold back remain fully visible.
   - Make Staff induction headings, completed/incomplete records, the sending steps, review screens, and lesson previews fit without clipping.
   - Preserve the current manual approval and sending behaviour exactly; no message or release will be triggered.

3. **Audit all signed-in areas by phone**
   - Check Dashboard, People, Schedule, Payroll, Leave, Documents & Compliance, Training, Onboarding, Contracts, Locations, Settings, reports, and staff-facing pages.
   - For each page, correct clipped text, unreachable actions, overlapping fixed controls, cramped grids, tabs, filters, tables, and dialogs.
   - Keep dense data available through contained horizontal scrolling or a phone-specific stacked presentation rather than hiding columns or actions.

4. **Protect existing behaviour**
   - Make presentation-only changes unless a broken phone interaction requires a narrowly scoped event-handling fix.
   - Do not publish courses, release lessons, send inductions, assign staff, activate reminders, issue certificates, or modify payroll, contracts, historical records, permissions, or stored data.

5. **Verify on real phone sizes**
   - Test narrow and standard phone widths, including the supplied 430×786 view.
   - Exercise navigation, tabs, forms, dialogs, dropdowns, scrolling, and primary actions.
   - Add focused regression checks for shared phone layout and the induction screen, then run the relevant existing checks.

## Completion standard
- No page-level sideways clipping.
- All text and controls are visible or intentionally available within a clearly scrollable data region.
- Every action remains reachable with phone-sized touch targets.
- Bottom navigation and floating actions do not cover page content.
- Existing permissions, workflow gates, records, and manual-send safeguards remain unchanged.

## Delivery approach
This is a broad pass, so implementation will proceed from shared foundations to the current compliance screen, then through each accessible area. Any remaining page-specific issue discovered during verification will be listed clearly rather than silently omitted.
