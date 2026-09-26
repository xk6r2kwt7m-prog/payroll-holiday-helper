# A03 draft: clock location evidence and a workable exception path

**Status:** code draft; do not deploy before an operational and privacy review. Stacked after A02 membership PR #17, independent of A01 database permissions.

Lovable has now reported private rebuilt-PostgreSQL results of 27/27 for PR #16 and 29/29 for PR #17 with fictional staff (see `a02-pr16-pr17-isolated-check-2026-09-26.md` on main). Their harness required a correction so postgres.js reads rota DATE as a plain string; the matching script fix is included in this draft. These results do **not** test the A03 GPS behaviour.

## Decision implemented in the draft

- Show a point-in-time location preview on opening the staff clock screen, then ask for a fresh reading at each clock action (`maximumAge: 0`). Never re-use a morning reading for an evening clock-out. This is not continuous tracking. Do not claim GPS proves attendance: coordinates supplied by a browser can be manipulated or inaccurate.
- For clock-in with a valid GPS reading, reject a position outside the selected branch's configured radius. A manager can record an adjustment through the existing audited timesheet route. A denied, timed-out or unavailable reading must not prevent a genuine shift from being recorded: staff select their branch and can clock in, with null coordinates, `clock_in_within_geofence=false` and a clear manager-review notice.
- For clock-out, always allow an active shift to end even when GPS is missing or outside the radius; record the reading where available, `clock_out_within_geofence=false`, and return an explicit review flag. Do not let the clock keep running solely because someone left the site or lost connectivity. If the server itself is unavailable, the action still fails, with no false success message.
- Reject incomplete, nonnumeric and out-of-range coordinate pairs. Latitude/longitude zero are real values; do not treat them as missing. Use the **selected site's configured radius** in the staff display; the server remains authoritative.
- Missing or outside-area evidence calls for human review. It must not automatically remove worked hours or prove misconduct. Existing pending timesheet approval remains in place.

## Checks before release

1. Run the extended private Postgres harness on the exact draft commit with fictional staff: in-range, outside, zero coordinates, invalid/missing GPS, clock-out away from branch, repeated requests and concurrent clock-outs. Verify recorded fields and no inadvertent shift/payroll writes.
2. Verify the manager timesheet panel distinguishes null coordinates (unavailable) from real coordinates outside the radius; this draft adds separate labels and preserves the existing pending approval and adjustment reason. Check any bulk or automatic approval path that might silently approve unverified entries; correct it as a separate follow-up if found.
3. Agree a short staff explanation and assess the purpose, lawful basis, access, retention and deletion of coordinates. The app currently stores raw coordinates and its on-demand map embeds coordinates in an OpenStreetMap URL, potentially sharing them with the map provider: this draft does not change either practice. Decide whether that map should instead use an internal/redacted view, and screen for a DPIA before deployment. ICO guidance says monitoring must be justified, necessary, proportionate and explained to staff; location data combined with other risk criteria may require a DPIA.
4. Test on a phone with GPS denied, timed out, inaccurate and outside the branch. Check accessibility, manager escalation, and that time worked remains reviewable when location cannot be established.

References (ICO):
- https://ico.org.uk/for-organisations/advice-for-small-organisations/news-blogs-and-events/blogs/employee-monitoring-is-it-right-for-your-business/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/examples-of-processing-likely-to-result-in-high-risk/

Rollback: redeploy the prior function and staff UI together; preserve time entries and their location evidence. No migration or live data edits in this draft.
