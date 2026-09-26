# Signed-in workflow checks — private test copy (fictional staff) — 26/09/2026

Setup: private copy of the app (this project's current code) pointed at the isolated rebuilt database with the four staff/training changes installed. No live data, no email, nothing published. Each run starts from a clean reset.

## Admin screens (Employees > staff sheet)
- PASS | UI: lost reply on Accept is not shown as success
- PASS | DB: server had already saved the passport decision once
- PASS | UI: after refresh passport no longer waiting
- PASS | DB: passport written once, one audit row
- PASS | UI: stale forename refused with message
- PASS | DB: stale refusal changed nothing
- PASS | UI: pay-rate change refused
- PASS | DB: pay-rate refusal changed nothing
- PASS | UI: bank confirmation succeeded
- PASS | DB: 2 verification rows, audit has no account numbers
- PASS | UI+DB: RTW verified recorded with expiry
- PASS | DB: one RTW receipt
- PASS | UI: decision from an out-of-date screen refused
- PASS | DB: out-of-date decision changed nothing
## Staff quiz (Staff portal > Training)
- PASS | DB: first (lost-reply) submission stored once
- PASS | DB: resubmitting after lost reply did not add a second attempt
- PASS | DB: server graded 0% and not passed
- PASS | UI: result screen shows the server's result
- PASS | Network: no answer key sent to the staff browser
- PASS | Direct forged attempt from staff browser refused
- PASS | Direct 'I passed' edit from staff browser changed nothing
- PASS | Direct read of answer key from staff browser returns nothing
- PASS | DB: second attempt passed 100%, two attempts total
## Role checks through the app's own connection
- PASS | anon decide_staff_detail_atomic 401 unchanged {"code":"42501","details":null,"hint":null,"message":"permission denied for function decid
- PASS | staff decide_staff_detail_atomic 403 unchanged {"code":"42501","details":null,"hint":null,"message":"Staff review access required"}
- PASS | supervisor decide_staff_detail_atomic 403 unchanged {"code":"42501","details":null,"hint":null,"message":"Staff review access required"}
- PASS | manager confirm_staff_bank_atomic 403 unchanged {"code":"42501","details":null,"hint":null,"message":"Company administrator confirmation r
- PASS | supervisor confirm_staff_bank_atomic 403 unchanged {"code":"42501","details":null,"hint":null,"message":"Company administrator confirmation r
- PASS | staff record_rtw_decision_atomic 400 unchanged {"code":"P0001","details":null,"hint":null,"message":"A review, evidence notes, decision a
- PASS | manager can accept a normal change 200 
- PASS | staff and supervisor refused recording right-to-work decisions (Workspace manager access required), nothing changed

## Findings
- Managers cannot see the staff-change review panel by default (needs the 'reveal sensitive' permission). Not a bug; admins can.
- An out-of-date second screen still shows 'not yet checked' until refreshed; saving from it is correctly refused with 'Evidence changed. Reload and review it before saving'.
- A lost connection on Accept shows 'Failed to fetch'; after refreshing, the decision is correctly shown as already made (saved once).

## Not done / blockers
- Latest successful backup time: not visible to me. Check Cloud > Database > Backups.
- Read-only archive for the deprecated February draft: design ready, SQL not yet written/tested.
- Splitting the holiday-payment saving fix from the grand-total change: not yet done; holiday release stays on hold.
- Contract-number security release: SQL and undo ready (20260926140000), callers checked (admin-only contract screen; supervisors have no contract access by default).
