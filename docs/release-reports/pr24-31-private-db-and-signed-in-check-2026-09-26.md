# PR #27, #24–#26 (+#29–#31) — private database and signed-in preview check, 26 Sep 2026

Private PostgreSQL rebuilt from project history; fictional staff only; outbound calls disabled.
Nothing installed on the shared database, clock-in service not deployed, nothing published, no live records changed.
The signed-in preview ran on a separate local copy wired only to the private database; any request to the live backend was blocked (none were attempted).

## #27 timesheet permission guard — 20/20 pass
- Draft's own script 9/9: manager with switch off cannot approve, delete or add; refused writes change nothing; admin keeps authority; switch on / no override lets managers approve; rollback restores old path.
- Extra 11/11: installing changes no timesheet; staff clock-in/out through the clock service still saves with the switch off; staff cannot approve own entry; supervisor cannot approve (unchanged); workspace B admin approves own workspace only; cross-workspace writes refused both ways; rollback removes only trigger + function, keeps timesheets and audit rows.

## #24–#26 clock-in service — 44/44 pass
- Draft script 32/32 (ownership, GPS rules, overnight 8.17 h, BST/GMT midnight, ambiguous shifts, missing/revoked membership, outages, concurrency).
- Extra 12/12: spring and autumn clock-change nights (hours = real elapsed 7 h / 9 h; repeated 01:30 links once); denied GPS saved and flagged; 400 m-off clock-in refused, outside clock-out closes and flagged; failed clock-in/out then retry leaves exactly one record; simultaneous in/out never leaves two open entries; revoked after overnight clock-in refuses staff clock-out, entry unchanged.
- Observed: GPS accuracy is ignored (a 900 m-accuracy reading inside the fence counts as "inside"). The clock service writes no audit_log row; evidence is the time entry itself.

## Signed-in preview (fictional manager) — 12/12 pass
- Select-all with 2 flagged: "Review 2 selected entry(s) first"; nothing approved.
- Selecting only the clean entry: "Approve 1"; only that entry approved.
- Outside-area entry shows the flag; Approve disabled until a reason is entered.
- Missing GPS shown as "location unavailable — check with staff", not "outside".
- Coordinates shown in the app only; no external map requests.
- Overnight open entry, staff access switched off: edit form shows 22:00 on 25 Sep (London); closing at 06:00 on 26 Sep saved 05:00 UTC, pending, 8.00 h, marked manager-adjusted with reason.

## Finding (pre-existing, not fixed)
Managers cannot write timesheet audit rows: audit_log insert policy allows only admins for `time_entries`.
- Manager approvals save, then the audit write is refused and the screen reports "Audit log failed".
- Manager edits/adds ignore the refused audit write; only the entry's own adjustment fields remain.

## Private database changes
Only fictional rows in throwaway private databases (a04, a04x, a02, ui). Private preview and data service shut down afterwards.
