# Subtle no-reply wording and Full Payroll grouping

## What changes

### Email wording

Keep the wording exactly as it is, but show this paragraph in a smaller, muted grey style in the delivered email:

> This is an automated email — replies to this address are not monitored. If you have any questions, please contact us through the usual channel.

It remains readable and included in the message, but it will no longer compete visually with the payroll details, pay date or confidentiality warning. The editable draft remains plain text; the subdued styling is applied only when the final email is built.

### Full Payroll grouping

When **Full Payroll Report** is selected in the Send window, show one additional choice:

- No grouping
- Department
- Location
- Role

The selected grouping is used in the attached PDF and shown in the attachment preview before sending. Other report types keep their existing fixed layouts and do not show this control.

Location grouping will use the same period location records as the existing PDF window. If the period has no location breakdown, the Send window will say so before sending and fall back to an employee-level report rather than silently producing the wrong grouping.

Role grouping will be made genuine. The current PDF window offers Role, but the PDF currently falls back to department grouping; the shared report grouping will be corrected so Role works consistently in both PDF creation paths.

## What does not change

- The email wording itself does not change.
- Philipp remains pre-filled and `barros.aderito@hotmail.com` remains always copied.
- Internal notes remain excluded and bank details remain off unless switched on.
- Full Payroll remains the default report type, with no grouping as its default.
- No payroll figures, employee records, periods, historical files or other app areas are changed.
- Nothing is emailed during testing, and nothing sends without pressing Send.

## Technical details

- Update the payroll email HTML builder to identify only the standard automated/no-reply paragraph after escaping user-edited content, and wrap it in subdued inline styling supported by common email clients. Both email-provider paths already use the same HTML output.
- Add Full Payroll `groupBy` state to the Send window, reset it to `none` whenever the window opens, and reset it when switching away from Full Payroll.
- Load the selected period's location breakdown with the existing payroll-location hook and pass it to the attached PDF, matching the current PDF builder.
- Add a shared role-grouping transformation and use explicit branches for `none`, `department`, `location` and `role` in the PDF renderer.
- Extend the payroll-email tests for conditional grouping controls/config, state isolation between report types, location fallback, genuine role grouping, and the subdued no-reply HTML. Re-deploy only the payroll-email sending function after verification.
