# Whole app interactive design preview

This draft extends the earlier Home / Employees / Payroll [workspace preview](./workspace-preview.html) to the full navigation. Open **`/prototype/`** on a Vite preview of this branch; for example, `npm run dev` then `http://localhost:8080/prototype/`. The route is served from `public/prototype/index.html`. It is deliberately separate from `src/App.tsx` and requires no login, credentials or backend.

## Try the journeys

- Change between **Desktop** and **Phone view**, and between light and dark. The preview also adapts to the actual browser width. Use the location and role pickers to see different views. Role switching is a display simulation, **not authorisation**.
- On **Home**, follow the urgent work cards. The manager view surfaces time, joining, holiday and payroll; staff see only their personal tasks.
- On **People**, search and filter Active / Joining / Former, open a record and switch location. Former colleagues stay in history and are not current holiday requests.
- On **Joining**, step through invitation, staff completion, human checks, contract and first-week tasks. Existing confirmed details should not be repeatedly requested. Bank/NI confirmation and right-to-work are depicted without storing any details.
- On **Contracts**, inspect the three stages and blocked terms. The preview will not send or sign a contract.
- On **Rota** and **Timesheets**, inspect coverage, overnight shifts, clock guidance, location evidence and the review queue. The preview does not clock in or approve.
- On **Holiday**, compare the fictional accrued/taken/available breakdown, preview a manager decision and separately view former-colleague history. No leave changes occur.
- On **Payroll**, inspect Prepare → Review → Approval → Share. Blockers remain visible at approval; no approval or pay calculations are performed. The only clickable final action acknowledges the walkthrough locally.
- On **Documents**, distinguish received evidence from verified decisions. On **Learning**, choose short lessons and mark local example progress. **Absence** shows a private case timeline.
- On **Messages**, view reminders and the difference between provider accepted and delivered. **Hiring**, **Locations**, **Reports** and **Settings** cover candidate handover, location scope, unknown-versus-zero reporting and permission failures.
- **Reset demo** clears all simulated choices. Browser refresh also restores initial state. Buttons and selectors are keyboard operable; a phone-sized layout is available without a device.

## File map and safe implementation boundary

| Path | Owns | Production integration destination |
| --- | --- | --- |
| `public/prototype/index.html`, `styles.css`, `app.js`, `ui.js`, `data.js` | Demo shell, tokens, route selection, local events, synthetic data | Review the visual system and extract shared primitives in a separate scoped change |
| `public/prototype/screens/people.js` | People, joining, contracts | `src/pages/Employees.tsx` and existing onboarding/contract components |
| `public/prototype/screens/work.js` | Home, rota, timesheets, holiday, payroll | Existing pages and domain components, one workflow per PR |
| `public/prototype/screens/care.js` | Compliance, learning, absence, messages | Existing documents, training, absence and communication components |
| `public/prototype/screens/organisation.js` | Reports, hiring, locations, settings | Existing reports, recruitment, locations and settings pages |
| `scripts/prototype/check.mjs` | Interaction and isolation smoke tests | Run with `node --test scripts/prototype/check.mjs` |

The directory does **not** import app code, call APIs, read storage, contain real staff records, replace rules, or require migrations. Never copy the fake role switch, fictional amounts, mock review actions or source data into production authority. Moving any screen into the real app needs current server permissions, loading/error states and a focused business-flow test. A static public route must be removed or gated before a production release if a preview should not be publicly discoverable.

## Acceptance before adopting a screen

1. Review 360–390px mobile and desktop, light and dark, keyboard focus and 200% zoom with real browser checks; this draft has only automated DOM interaction smoke tests and a build check.
2. Identify the original page’s current data shapes, permissions and backend guards. Keep them authoritative. Check loading, failure, empty, stale and partial states; do not treat a failed read as a successful zero.
3. Move **one journey at a time**, keep edits to its existing page/components, and add behaviour tests for changed actions. Keep the rest of the prototype untouched until explicitly requested.
4. Do not merge or publish a preview simply to look at it. Review the branch preview path `/prototype/` first. Production integration and any database work are separate releases.

## Ready-to-send Lovable message

> Use the existing draft PR for the whole-app interactive preview. Open `/prototype/` on that PR’s preview branch and review its working desktop and mobile journeys, including People, Joining, Contracts, Rota, Timesheets, Holiday, Payroll, Documents, Learning, Absence, Messages, Hiring, Locations, Reports and Settings. The code, fictional data and interaction checks are already in `public/prototype/`, `scripts/prototype/check.mjs` and `docs/design/whole-app-interactive.md`; **do not recreate the prototype or spend credits generating a replacement**. Give me screenshots or a preview link and a short list of visual/accessibility observations. Do not merge the PR, publish, connect live staff data, change business logic or apply migrations. We will agree which individual screen to integrate into the existing app next.
