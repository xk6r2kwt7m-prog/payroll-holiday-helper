# A06 (PR #32, head e072fa2d) — private database check, 26 Sep 2026

Private PostgreSQL rebuilt from project history; fictional staff only; outbound calls stubbed.
Nothing installed on the shared database, clock service not deployed, nothing published, no live records changed.

- Conflict check: all 7 modified files matched PR base 96574f6b byte-for-byte; 6 new files did not exist. Applied unchanged.
- App: typecheck, architecture check, build pass; 1,951 tests in 148 files pass.
- `a06_atomic_timesheet_history.py` (with #27 installed): 31/31 pass.
- `a02_clock_iso.mjs` with #27 + A06 installed: 33/33 pass (overnight, BST/GMT midnight, GPS, concurrency, revoked/missing membership, outages).
  Resulting history: 14 create / 6 update / 14 delete rows, all `actor_source=server`, zero raw coordinates.
- Extra A06 checks: 13/13 pass — exactly one history row per clock-in/out; refused retries and invalid GPS add none; 4 concurrent clock-ins and 2 concurrent clock-outs each produce one row; spring (7 h) and autumn (9 h) clock-change nights; audit outage during clock-in saves nothing; manager A cannot change workspace B, admin B reads only B history, staff read none, manager direct audit insert denied; with A06 SQL removed the new clock service returns 503 and writes nothing.

## Live-facing effect if only the app code is published
Manager add, edit, approve, reject and override of timesheets would refuse ("Secure timesheet history is not available yet. Nothing was changed.") until the SQL is installed. Staff clock-in/out is unaffected while the current clock service stays deployed; deploying the new clock service before the SQL would stop staff clocking in/out.
