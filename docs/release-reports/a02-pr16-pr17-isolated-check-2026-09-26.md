# PR #16 + stacked PR #17 (A02 clock) — isolated database review, 26 Sep 2026

Not deployed, merged or published. No live staff access changed. A01 untouched.
Heads: PR #16 `5988cdae`, PR #17 `1769cd34`. Private PostgreSQL 17 rebuilt from project history, fictional staff, no live data, no email.

- Synthetic app tests (both PRs' test files, run against each exact handler): 36/36 pass.
- Isolated harness: PR #16 27/27, PR #17 29/29 (adds revoked clock-out and membership-outage checks).
- Harness defect found and corrected locally: the test database client returned rota dates as full timestamps, while the live data service returns `YYYY-MM-DD`. Uncorrected, the handler's time-zone matching failed with "Could not check the rota time" and the harness crashed after the overnight case. With dates returned as live does, all cases pass. The same one-line change (`types.date` parse as text) should go into `a02_clock_iso.mjs` in PR #16.
- Covered: overnight 22:00–06:00 links and closes (8.17 h); BST 00:25 and 23:50 early; GMT 23:50; two plausible shifts link neither; foreign/other-branch shifts refused; concurrent clock-ins/outs; read failures give retry errors; linked employee with no membership still clocks (unchanged); revoked membership refused at clock-in and clock-out; membership outage refuses without writing; workspace B untouched.

## Open clock-in after access is revoked
Database check: a workspace manager can close the entry (set clock-out + note) — it becomes `pending`, 7.50 h, for normal approval. The revoked staff member can no longer edit it.
App path: Timesheets → entry → Edit entry (reason required). Code reading only (not signed-in tested): the edit form builds the clock-out on the clock-in's date, so an overnight open entry may need the date handled before it can be closed correctly.
