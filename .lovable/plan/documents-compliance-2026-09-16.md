# Documents & Compliance

A new main tab that holds every document, certificate and induction record for the restaurants — separate from payroll, holidays and contracts, which stay exactly as they are today.

## What you get

**One new tab: Documents & Compliance**, with five areas:

1. **Staff Induction** — pick a person, the pack is chosen for you, press Send.
2. **Document Library** — the master copy of every policy, procedure, licence and certificate.
3. **Branch Compliance** — a digital folder per restaurant (Carnaby, Fitzrovia, Brixton).
4. **Certificates & Expiry** — licences and certificates with renewal reminders.
5. **Inspection File** — the "inspector is here" view, per restaurant, with a downloadable pack.

Plus a small attention panel at the top: incomplete inductions, staff awaiting alcohol authorisation, expiring certificates, missing inspection documents, open actions. Green / amber / red / grey. Nothing shows once it is done.

## Staff induction, step by step

You choose the person. The system already knows their restaurant, role and start date, so it selects every active document that applies to that restaurant and role and shows you, for example, "12 documents selected automatically". You can drop one, add one, then confirm their email address and press **Send induction**. One email, one secure link — no separate email per document.

The staff member opens the link on their phone and sees each document with a short explanation, a View button, a tick box and, where required, a signature. A progress bar shows how far along they are. At the end they confirm the wording you asked for, and if alcohol sales are part of their role there is a second, separate acknowledgement and authorisation. No account or password needed.

Once finished, the record is saved automatically to their profile under **Training & Compliance**: documents received, version of each, when opened, when completed, signature, who issued it, alcohol authorisation status — and a downloadable completion record.

Bulk sending to several people at once, and sending a single document without a full pack, are both included.

## Alcohol-sales authorisation

Each relevant person gets a written authorisation record: restaurant, authorising DPS or personal licence holder, date, their signature, the authoriser's confirmation, and a status of pending, active, revoked or archived. Their profile and the branch list show plainly whether they are currently authorised. When someone leaves, their authorisation moves to revoked automatically and the history stays. Only an admin, the DPS or a nominated personal licence holder can approve one.

## Branch compliance and inspection file

Each restaurant's folder holds the premises licence Part A and Part B, the Section 57 notice, DPS details and licence copies, the current authorised-staff list with their signed authorisations, age-verification policy and signage, health and safety, food safety, allergen and fire documents, incident and refusal records, certificates, fee receipts, council correspondence, inspection reports and corrective actions with evidence. Documents can be uploaded straight to a restaurant or linked from the library so nothing is uploaded twice.

**Open Inspection File** gives one screen per restaurant: document name, status, expiry, whether it is displayed at the premises, whether a paper copy is held, last review date and any outstanding action. You can open each document, download or email the whole pack, mark something as displayed, add a note or action and upload evidence that it was done.

The Westminster/Carnaby checklist ships pre-loaded (Part B displayed, Section 57 signed and displayed, Part A in the folder, personal licence copy on site, age-verification signs displayed, fire panel action, incident book, fees paid with receipt, reinspection date) and is fully editable per restaurant and council.

## Certificates and reminders

Type, restaurant, licence or certificate number, named holder, issue and expiry date, renewal status, the document, the payment receipt and notes. Reminders at 90, 60 and 30 days before expiry and on the day. Branch managers see only their own restaurant; the Operations Manager sees all.

## Document updates and versions

Replacing a document archives the old version and makes the new one active. The system lists who is affected, and the Operations Manager decides whether they must re-acknowledge — if so, it goes out automatically. The exact version each person signed is always visible.

## Permissions

- **Admin / Operations Manager** — everything, all restaurants.
- **Branch Manager** — their restaurant: send inductions, see completion, upload branch documents, update inspection actions, see reminders. Cannot change company-wide master documents unless granted.
- **Staff** — only their own assigned documents, acknowledgements, signatures and completed records.

## Safety

No existing logic changes. Payroll, holiday, minimum wage, service charge, contracts, timesheets and scheduling calculations are untouched, and this feature never writes to their tables. Everything here is additive: new tables, new pages, one new menu entry.

---

## Technical notes

**New tables** (all `tenant_id`-scoped, RLS + GRANTs, no FKs to `auth.users`):

- `compliance_documents` — master library: name, category, version, file path, `applies_to_all_branches` + `branches text[]`, `roles text[]`, requires_signature, must_display, inspection_required, expires_at, status (active/expired/archived), `supersedes_document_id`.
- `induction_packs` — one per send: employee_id, branch, role, issued_by, token, sent_at, opened_at, completed_at, status, `final_statement_signature`.
- `induction_pack_items` — pack_id, document_id, document_version, acknowledged_at, signature_data, order.
- `alcohol_authorisations` — employee_id, branch, authoriser_employee_id, authoriser_role (dps/personal_licence_holder), authorised_at, employee_signature, authoriser_confirmed_at, status (pending/active/revoked/archived), revoked_reason.
- `branch_compliance_items` — branch, document_id (nullable) or direct file path, category, is_displayed, physical_copy_held, last_reviewed_at, expiry_date, notes.
- `compliance_actions` — branch, title, source (inspection/internal), due_date, status, completed_at, evidence_file_path, notes.
- `compliance_certificates` — branch, type, certificate_number, holder_name, issue_date, expiry_date, renewal_status, file_path, receipt_path, notes.
- `inspection_checklist_items` — branch, label, required, status, displayed, notes, sort_order (seeded with the Westminster list, editable).

Storage: reuse the existing `employee-documents` bucket with a `compliance/` prefix, served through the existing `/document/view` proxy and `serve-document` signed-URL function.

**Reused, not rebuilt:** `useTenantBranches` for restaurants, `useTenantGuard` + tenant_id filters for isolation, `useManagerScope` for branch-limited managers, `document_audit_log` for the audit trail, the `signing_tokens` pattern and public `/sign/:token` style route for the staff induction link, `send-notification` for the induction email, and the `check-document-expiry` cron pattern for a new `check-compliance-expiry` function (90/60/30/0 days).

**New pages/routes:** `/compliance` (tab shell with the five sections), `/compliance/inspection/:branch`, public `/induction/:token`. Sidebar + mobile nav gain one "Documents & Compliance" entry, admin/manager gated.

**New edge functions:** `send-induction-pack` (builds the pack, mints the token, emails one link), `induction-portal` (public GET/POST for viewing and acknowledging, no auth), `check-compliance-expiry` (scheduled reminders).

**Pure libraries + tests:** `src/lib/induction-pack-selection.ts` (branch × role × active → document set), `src/lib/alcohol-authorisation-status.ts` (status resolution, auto-revoke on leaver), `src/lib/compliance-expiry.ts` (90/60/30/0 bands), `src/lib/inspection-readiness.ts` (red/amber/green/grey rollup) — each with a vitest suite, plus a guard test asserting no payroll/holiday/NMW/service-charge module is imported by compliance code.

**Delivery order:** 1) migration + library CRUD; 2) induction selection, send and staff portal; 3) alcohol authorisations + employee profile tab; 4) branch compliance, inspection file, PDF/email pack; 5) certificates, reminders, dashboard panel, versioning and re-acknowledge.
