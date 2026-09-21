# Choose the report type when sending payroll by email

## What changes

When you press Send on a pay period, the window will show a **Report type** choice at the top, using exactly the same four options as the PDF window:

- **Full Payroll Report** — complete report with all details (the current behaviour, stays the default)
- **Condensed Summary** — names, hours and totals only
- **Accounting Report** — financial focus with all money columns
- **HR Review** — employee overview with no financial amounts

Pick one, and the attached PDF is built that way. The choice is shown in the preview ("Attached: Condensed Summary — payroll-September-2026.pdf") so you can see what is going out before you send.

## What does not change

- Philipp Chaykin is still pre-filled as the recipient, and you are still always copied in.
- The PDF is still attached and a copy still filed for the audit trail.
- Internal notes are still excluded from the attachment.
- Bank details still stay off unless you switch them on.
- The wording, the "replies not monitored" line and Reset to the standard wording all stay as they are.
- Nothing sends until you press Send. No other part of the app is touched.

## Technical notes

- `SendPayrollEmailDialog.tsx`: add `presetKey` state (default `"full"`), a Select fed from `REPORT_PRESETS` in `PayrollReportConfig.ts`. On send, build the config as `{ ...defaultReportConfig, ...REPORT_PRESETS[presetKey].config, sortBy: "alphabetical", showLogo: true, showNotes: false }` and pass it to `PayrollPDF` in place of the current hardcoded config. Reset `presetKey` to `"full"` in `handleOpen`.
- File name gains a preset suffix for non-full reports (e.g. `payroll-September-2026-condensed.pdf`); `full` keeps the current name.
- Preview block shows the selected report type label alongside the attachment name.
- Extend `src/test/phase-payroll-email-cc.test.ts` with a check that each preset key resolves to a valid config and that `showNotes` stays false regardless of preset.
- No database, edge function or email-wording changes; the deployed `send-payroll-email` function needs no update.
