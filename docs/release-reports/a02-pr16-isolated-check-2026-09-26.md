# PR #16 (A02 clock server checks) — isolated database review, 26 Sep 2026

Not deployed. PR #16 head `063ac034`. Handler run against a private PostgreSQL 17 rebuild of project history (fictional staff, no live data, no email), with real unique index and time triggers. Script: `supabase/pending-migrations/tests/isolated/a02_clock_iso.mjs` (arg = handler path).

- PR #16 synthetic tests: 10/10 pass.
- PR #16 handler on isolated DB: 22/24 pass. Current live handler, same checks: 12/24.
- Fixed by PR #16 (current handler fails): foreign/other-employee/other-branch shift IDs, branch from another workspace, GPS near a different branch, branch/open-entry read failures, clock-out read failure, concurrent double clock-out.
- Overnight: shift dated day D 22:00–06:00 links and closes correctly (8.17 h). Two failures, both pre-existing and unchanged: fallback match uses UTC date, so (a) clocking in before midnight for a shift dated the next day, and (b) London BST 00:00–00:59 clock-ins, save no shift link. The app never sends `shift_id`, so real clock-ins always use this fallback.
- Access path: linked employee with no membership still clocks in/out, with and without workspace selector (unchanged). Revoked membership still clocks in (finding, not addressed). Live read-only count: 1 active linked employee without membership, 0 inactive.

Release order: see chat report / PR.
