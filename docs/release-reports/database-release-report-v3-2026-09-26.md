# Database release preparation — report v3 (26 Sep 2026)

Preparation and isolated testing only. Nothing installed live, nothing published, no live records changed, no emails sent.
Isolated database: rebuilt privately from the project's change history (PostgreSQL 17.9), fictional staff only, outbound calls disabled, live access rules matched. Only read-only queries touched the live database.

## Results this round (179 of 179 isolated checks passed; app: 1,876 tests / 138 files, type check and build clean)

| Release | Checks | Readiness | Remaining blockers |
|---|---|---|---|
| A. Staff approvals, quiz grading, standard-module fix, RTW protections (PR #12/#13) | 94 + 31 signed-in (earlier) | Ready for your approval | Latest successful backup time not confirmed |
| A2. Manager ordinary-detail review (optional add-on to A) | 42 | Ready for your approval, install with or after A | Same backup blocker |
| B. Read-only payroll period archive | 80 | Ready for your approval; archiving February is a separate, deliberate action afterwards | Backup; app has no archive button or badge yet (archiving would be run once by an administrator action) |
| C. Contract-number security fix | 18 | Ready for your approval, independent of all others | Backup |
| H1. Holiday-payment saving fix (current rules kept) | 39 | Ready for your approval, independent of A | Backup |
| H2. Grand-total rule change | Built, not proposed | HELD by your instruction | Your reconciliation decision |

## B. February archive — confirmed
- Installing it archives nothing. Archiving is a company-administrator-only action with a reason, refused if the period changed since it was viewed.
- Archiving stores a snapshot and record counts; the period row itself (status, all four totals, updated time) stays byte-identical. Fictional £7,660.35 holiday total unchanged.
- Once archived, refused for admins and server functions alike: editing/deleting the period, recalculating totals, adding/editing/deleting entries, holiday payments, adjustments, notes, imports, locations, minimum-wage audit, overpayment moves, and holiday-ledger writes tied to its entries.
- The archive record itself cannot be edited, deleted or truncated. Overpayments raised in it can still be recovered in a later period. Other periods behave exactly as before.
- Forced failure part-way through archiving left nothing behind. Undo removes the guards and keeps the archive record and audit history.
- Live February draft (read-only check): 0 entries, 1 import, 38 overpayments, 36 audit rows, holiday total £7,660.35 — all would be kept.

## H1. Holiday saving fix — confirmed it keeps today's rules
- Ran the same 8-step sequence (creates, edit, deletes, a payroll-entry edit) two ways: the old browser method and the new database action. Period totals and holiday ledger were identical after every step.
- Holiday total = sum of that period's holiday payments; grand total = entry pay + holiday pay (as the old app did). Holiday pay counted once. Stored timesheet total is not rewritten (a deliberately different stored value stayed as it was). Incentives total never touched. The payroll-entry recalculation rule is byte-identical to today.
- 12 simultaneous saves: all succeeded, totals correct, exactly one ledger debit per payment. Approved periods refuse saves. Forced failure left payments, ledger and totals unchanged.
- H1 + H2 together equal the original combined change exactly, proving the split is clean.
- Undo keeps every payment, ledger entry, total and receipt, and restores functions and triggers exactly.

## A2. Manager review — how it works without widening sensitive access
- Managers get a separate panel on the staff page showing only: forename, surname, preferred name, email, nationality — for staff in their own branches.
- The database enforces this, not just the screen: managers are refused on NI number, passport, bank, share code, residence permit, date of birth, settlement status and anyone outside their branches, for accept and reject; nothing changed on refusal.
- Bank confirmation stays administrator-only. The "reveal sensitive details" permission is not changed. Undo restores the reviewed function exactly and keeps decisions and audit.

## C. Contract numbering — exact SQL
Callers: contract form, contract drift panel, contract corrections, automatic draft (all admin screens today) plus server functions. Supervisors have no contract access by default and would be refused. Existing numbers and the counter are untouched; tested: counter 41 continued 42 → 45.

### Fix
```sql
-- PROPOSED ONLY (26 Sep 2026). Separate approval. Found while checking functions callable while signed out.
-- allocate_contract_reference had no permission check: anyone (even signed out) could advance any
-- workspace's contract-number counter. Existing counters and issued references are not changed.
BEGIN;
CREATE OR REPLACE FUNCTION public.allocate_contract_reference(_tenant_id uuid, _prefix text DEFAULT 'UD-EC'::text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _year integer := EXTRACT(YEAR FROM now())::integer;
  _next integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_tenant_manager_or_above(_tenant_id) THEN
    RAISE EXCEPTION 'Manager access required to allocate a contract reference' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.contract_reference_counters (tenant_id, year, last_number)
  VALUES (_tenant_id, _year, 1)
  ON CONFLICT (tenant_id, year)
  DO UPDATE SET last_number = public.contract_reference_counters.last_number + 1
  RETURNING last_number INTO _next;
  RETURN _prefix || '-' || _year::text || '-' || lpad(_next::text, 4, '0');
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.allocate_contract_reference(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.employee_sensitive_fields(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tenant_sensitive_fields(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_locked_contract_object(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_contract_reference(uuid, text), public.employee_sensitive_fields(uuid),
  public.tenant_sensitive_fields(uuid), public.is_locked_contract_object(text) TO authenticated, service_role;
COMMIT;
```

### Undo
```sql
-- Restores the previous (unchecked) allocate_contract_reference and signed-out execute access. Counters untouched.
BEGIN;
CREATE OR REPLACE FUNCTION public.allocate_contract_reference(_tenant_id uuid, _prefix text DEFAULT 'UD-EC'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _year integer := EXTRACT(YEAR FROM now())::integer;
  _next integer;
BEGIN
  INSERT INTO public.contract_reference_counters (tenant_id, year, last_number)
  VALUES (_tenant_id, _year, 1)
  ON CONFLICT (tenant_id, year)
  DO UPDATE SET last_number = public.contract_reference_counters.last_number + 1
  RETURNING last_number INTO _next;

  RETURN _prefix || '-' || _year::text || '-' || lpad(_next::text, 4, '0');
END;
$function$;
GRANT EXECUTE ON FUNCTION public.allocate_contract_reference(uuid, text), public.employee_sensitive_fields(uuid),
  public.tenant_sensitive_fields(uuid), public.is_locked_contract_object(text) TO anon;
COMMIT;
```

## Assumptions (not proven here)
- The rebuild matches live closely enough; 3 live-only tables are unused by these changes.
- Live holiday-payment saves are probably failing today (inferred from the code, not observed).
- Signed-in checks used a private app copy, not the production site.

## Blockers for any production release
1. Confirm the latest successful backup in Cloud → Database → Backups (daily, ~14 days, no exact-moment restore).
2. Your separate approval per release (A, A2, B, C, H1). H2 stays held.
3. Each database release must be followed straight away by publishing the matching app version.

## Release order when approved
Quiet time → confirm backup → C (independent) → A (approvals, quiz grading, module fix, RTW) → A2 → publish app → smoke test → H1 → smoke test a holiday save → B → archive February as a separate admin action.
Recovery: restore previous app version, then run undo scripts in reverse order. Nightly backup restore is a last resort and loses later changes.

## File fingerprints (SHA-256)
52f181840f474d08df328ed828e57227a78184caf72a2072264fb1bbeb2d9f7b  20260926150000_payroll_period_archive.proposed.sql
79b57a4f14061d54b3445de51b2e596f21debfd77b3ba12f1302a7c79de69241  20260925090010_atomic_holiday_payments_saving_only.proposed.sql
14035bfbb73963ab896976231a8222005e872af409b64feab6fb92840d08b29e  20260925090500_holiday_grand_total_rule.HELD.sql
fd8708e8f255e98d8c2365dae91e184b2d9e805b2ce9e070531c117b7cb0028d  20260926110500_manager_ordinary_staff_review.proposed.sql
554de1ea0b3e3b47e3773d12c9a79673a2e68752c515ade1b0995942a16780d4  20260926140000_signed_out_function_hardening.proposed.sql
5efb31a1eb9ca168665cf8b4870b06100098f6df2b34dc33e6acb9c80accc8b5  rollback/20260926150000_payroll_period_archive.down.sql
05e71dafb3f978d817383d56f448e529e48a9e9c8c185aa1d71cb6f8d8c6627d  rollback/20260925090010_atomic_holiday_payments_saving_only.down.sql
6a68d1b88555344ef7f3c6a948d5c547c4396bdd9d9bc0d22278364eb16ab771  rollback/20260926110500_manager_ordinary_staff_review.down.sql
b3e611c33c03eced330ffd8ac5c64d2d0ba8c3c40a3aaaed71fff681836ce5db  rollback/20260926140000_signed_out_function_hardening.down.sql

Test scripts: supabase/pending-migrations/tests/isolated/
