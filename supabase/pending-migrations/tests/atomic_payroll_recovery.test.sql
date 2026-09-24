-- Database tests for 20260924210000_atomic_payroll_recovery.sql.
-- Run ONLY against a private throwaway copy of the schema (never the live
-- database). Runner: supabase/pending-migrations/tests/run.sh
\set ON_ERROR_STOP 1
SET client_min_messages = warning;

CREATE TABLE IF NOT EXISTS public.t_results (n serial, name text, ok boolean, detail text);
GRANT ALL ON public.t_results TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.t_results_n_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.t(_name text, _ok boolean, _detail text DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$ INSERT INTO public.t_results(name, ok, detail) VALUES (_name, coalesce(_ok, false), _detail) $$;

-- Runs _sql and passes if it raises an error matching _pattern.
CREATE OR REPLACE FUNCTION public.t_err(_name text, _sql text, _pattern text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE _sql;
  PERFORM public.t(_name, false, 'no error raised');
EXCEPTION WHEN OTHERS THEN
  PERFORM public.t(_name, SQLERRM ~* _pattern, SQLERRM);
END $$;
GRANT EXECUTE ON FUNCTION public.t(text, boolean, text), public.t_err(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.as_user(_uid uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claim.sub', coalesce(_uid::text, ''), false) $$;
GRANT EXECUTE ON FUNCTION public.as_user(uuid) TO authenticated;

-- Fingerprint of everything tied to a period, to prove byte-identical restores.
CREATE OR REPLACE FUNCTION public.t_fingerprint(_pid uuid) RETURNS text LANGUAGE sql AS $$
  SELECT md5(concat_ws('|',
    (SELECT to_jsonb(p) - 'updated_at' FROM payroll_periods p WHERE id = _pid)::text,
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM payroll_entries t WHERE payroll_period_id = _pid)::text,
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM payroll_entry_locations t WHERE payroll_period_id = _pid)::text,
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM payroll_adjustments t WHERE payroll_period_id = _pid)::text,
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM payroll_nmw_audit t WHERE payroll_period_id = _pid)::text,
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM payroll_period_notes t WHERE payroll_period_id = _pid)::text,
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM holiday_payments t WHERE payroll_period_id = _pid)::text,
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM holiday_ledger t WHERE source_id IN
        (SELECT id FROM payroll_entries WHERE payroll_period_id = _pid UNION SELECT id FROM holiday_payments WHERE payroll_period_id = _pid))::text,
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM payroll_overpayments t WHERE payroll_period_id = _pid)::text,
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM payroll_imports t WHERE payroll_period_id = _pid)::text,
    (SELECT jsonb_agg(to_jsonb(t) - 'updated_at' ORDER BY id) FROM admin_notes t WHERE payroll_period_id = _pid)::text
  )) $$;

-- ---------------------------------------------------------------- fixtures
INSERT INTO auth.users(id, email) VALUES
  ('a0000000-0000-0000-0000-00000000000a', 'admin-a@test'),
  ('b0000000-0000-0000-0000-00000000000b', 'admin-b@test'),
  ('c0000000-0000-0000-0000-00000000000c', 'manager-a@test'),
  ('d0000000-0000-0000-0000-00000000000d', 'platform@test');

INSERT INTO tenants(id, name, slug) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Tenant A', 'tenant-a'),
  ('22222222-0000-0000-0000-000000000002', 'Tenant B', 'tenant-b');

INSERT INTO tenant_members(tenant_id, user_id, role, is_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'company_admin', true),
  ('22222222-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-00000000000b', 'company_admin', true),
  ('11111111-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c', 'manager', true);
INSERT INTO platform_admins(user_id) VALUES ('d0000000-0000-0000-0000-00000000000d');

INSERT INTO employees(id, tenant_id, forename, surname, department, hourly_rate) VALUES
  ('e1000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Ana', 'One', 'FOH', 12.21),
  ('e2000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Ben', 'Two', 'BOH', 13.50),
  ('eb000000-0000-0000-0000-00000000000b', '22222222-0000-0000-0000-000000000002', 'Bea', 'Other', 'FOH', 12.21);

-- A fully populated period for tenant A. _n makes ids unique per period.
CREATE OR REPLACE FUNCTION public.t_seed(_pid uuid, _n int, _status text, _start date) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  ta uuid := '11111111-0000-0000-0000-000000000001';
  e1 uuid := 'e1000000-0000-0000-0000-000000000001';
  e2 uuid := 'e2000000-0000-0000-0000-000000000002';
  x text := lpad(_n::text, 4, '0');
BEGIN
  INSERT INTO payroll_periods(id, tenant_id, period_name, start_date, end_date, pay_date, status, notes, incentives_total, holidays_total, sales_total, period_weeks)
  VALUES (_pid, ta, 'Period ' || x, _start, _start + 27, _start + 31, 'draft', 'n', 25.5, 88.8, 1000, 4);
  INSERT INTO payroll_entries(id, payroll_period_id, employee_id, tenant_id, hourly_rate, service_charge, timesheet_hours, performance_bonus, special_bonus, notes, adjustment_note)
  VALUES (('f1' || x || '00-0000-0000-0000-000000000001')::uuid, _pid, e1, ta, 12.21, 1.1, 100.25, 10, 0, 'x', 'adj'),
         (('f2' || x || '00-0000-0000-0000-000000000002')::uuid, _pid, e2, ta, 13.50, 0, 80, 0, 5.5, NULL, NULL);
  INSERT INTO payroll_entry_locations(id, payroll_entry_id, payroll_period_id, employee_id, location_name, department, hours, tenant_id)
  VALUES (('a1' || x || '00-0000-0000-0000-000000000001')::uuid, ('f1' || x || '00-0000-0000-0000-000000000001')::uuid, _pid, e1, 'Carnaby', 'FOH', 60.25, ta),
         (('a2' || x || '00-0000-0000-0000-000000000002')::uuid, ('f1' || x || '00-0000-0000-0000-000000000001')::uuid, _pid, e1, 'Brixton', 'FOH', 40, ta);
  INSERT INTO payroll_adjustments(id, payroll_period_id, payroll_entry_id, employee_id, tenant_id, field_name, old_value, new_value, note)
  VALUES (('ad' || x || '00-0000-0000-0000-000000000001')::uuid, _pid, ('f1' || x || '00-0000-0000-0000-000000000001')::uuid, e1, ta, 'timesheet_hours', 99, 100.25, 'late shift');
  INSERT INTO payroll_nmw_audit(id, tenant_id, payroll_period_id, payroll_entry_id, employee_id, age_band, is_apprentice, required_rate, effective_rate, eligible_pay, actual_hours, status, calculation_basis)
  VALUES (('ab' || x || '00-0000-0000-0000-000000000001')::uuid, ta, _pid, ('f1' || x || '00-0000-0000-0000-000000000001')::uuid, e1, '21+', false, 12.21, 12.21, 1224.05, 100.25, 'compliant', '{"k":1}');
  INSERT INTO payroll_period_notes(id, payroll_period_id, employee_id, tenant_id, note, show_on_pdf, category)
  VALUES (('ae' || x || '00-0000-0000-0000-000000000001')::uuid, _pid, e2, ta, 'internal', false, 'general');
  INSERT INTO holiday_payments(id, payroll_period_id, employee_id, employee_name, rate, hours, total, tenant_id, holiday_taken_date)
  VALUES (('ac' || x || '00-0000-0000-0000-000000000001')::uuid, _pid, e2, 'Ben Two', 13.50, 8, 108, ta, _start + 3);
  INSERT INTO holiday_ledger(id, employee_id, tenant_id, leave_year_start, entry_date, entry_type, hours, amount, source_table, source_id, notes)
  VALUES (('af' || x || '00-0000-0000-0000-000000000001')::uuid, e2, ta, date_trunc('year', _start)::date, _start + 3, 'holiday_taken', -8, 108, 'holiday_payments', ('ac' || x || '00-0000-0000-0000-000000000001')::uuid, 'taken');
  INSERT INTO payroll_overpayments(id, payroll_period_id, employee_id, overlap_start_date, overlap_end_date, estimated_overlap_hours, hourly_rate, service_charge, estimated_overpayment, recovery_status, recovered_amount, recovered_in_period_id, tenant_id)
  VALUES (('a0' || x || '00-0000-0000-0000-00000000000f')::uuid, _pid, e1, _start, _start + 2, 6, 12.21, 0, 73.26, 'recovered', 73.26, _pid, ta);
  INSERT INTO payroll_imports(id, payroll_period_id, file_name, file_path, import_status, records_imported, tenant_id)
  VALUES (('bb' || x || '00-0000-0000-0000-000000000001')::uuid, _pid, 'timesheet.csv', 'x/timesheet.csv', 'completed', 2, ta);
  INSERT INTO admin_notes(id, employee_id, payroll_period_id, note, status, tenant_id)
  VALUES (('cc' || x || '00-0000-0000-0000-000000000001')::uuid, e1, _pid, 'check bank', 'open', ta);
  IF _status <> 'draft' THEN
    EXECUTE format('UPDATE payroll_periods SET status = %L WHERE id = %L', _status, _pid);
  END IF;
END $$;

SELECT t_seed('50000000-0000-0000-0000-000000000001', 1, 'draft',    '2026-01-05');
SELECT t_seed('50000000-0000-0000-0000-000000000002', 2, 'pending',  '2026-02-02');
SELECT t_seed('50000000-0000-0000-0000-000000000003', 3, 'rejected', '2026-03-02');
SELECT t_seed('50000000-0000-0000-0000-000000000004', 4, 'approved', '2026-03-30');
SELECT t_seed('50000000-0000-0000-0000-000000000005', 5, 'draft',    '2026-04-27');
SELECT t_seed('50000000-0000-0000-0000-000000000006', 6, 'draft',    '2026-05-25');
SELECT t_seed('50000000-0000-0000-0000-000000000007', 7, 'draft',    '2026-06-22');
SELECT t_seed('50000000-0000-0000-0000-000000000008', 8, 'draft',    '2026-07-20');

CREATE TABLE public.t_state AS
  SELECT t_fingerprint('50000000-0000-0000-0000-000000000001') AS fp1,
         (SELECT sum(hours) FROM holiday_ledger WHERE employee_id = 'e2000000-0000-0000-0000-000000000002') AS bal_e2,
         (SELECT count(*) FROM audit_log) AS audit0;
GRANT SELECT ON public.t_state TO authenticated;
GRANT SELECT ON public.payroll_periods, public.payroll_entries, public.holiday_ledger TO authenticated;

-- ================================================================ auth boundary
SET ROLE authenticated;
SELECT as_user(NULL);
SELECT t_err('unauthenticated delete refused',
  $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000001', gen_random_uuid(), NULL)$$, 'signed in');
SELECT as_user('b0000000-0000-0000-0000-00000000000b');
SELECT t_err('other workspace admin refused',
  $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000001', gen_random_uuid(), NULL)$$, 'company administrator');
SELECT as_user('d0000000-0000-0000-0000-00000000000d');
SELECT t_err('platform administrator refused',
  $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000001', gen_random_uuid(), NULL)$$, 'company administrator');
SELECT as_user('c0000000-0000-0000-0000-00000000000c');
SELECT t_err('manager refused',
  $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000001', gen_random_uuid(), NULL)$$, 'company administrator');
SELECT t_err('helper functions not callable by app users',
  $$SELECT payroll_recovery_is_company_admin('11111111-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a')$$, 'permission denied');

-- ================================================================ status gate
SELECT as_user('a0000000-0000-0000-0000-00000000000a');
SELECT t_err('pending refused',  $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000002', gen_random_uuid(), NULL)$$, 'only a draft');
SELECT t_err('rejected refused', $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000003', gen_random_uuid(), NULL)$$, 'only a draft');
SELECT t_err('approved refused', $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000004', gen_random_uuid(), NULL)$$, 'only a draft');
RESET ROLE;
SELECT t('refused periods untouched', (SELECT count(*) FROM payroll_periods WHERE id IN
  ('50000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000004')) = 3
  AND (SELECT count(*) FROM payroll_entries WHERE payroll_period_id IN
  ('50000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000004')) = 6);
SELECT t('nothing written by refusals', (SELECT count(*) FROM payroll_period_recoveries) = 0 AND (SELECT count(*) FROM audit_log) = (SELECT audit0 FROM t_state));

-- ================================================================ tenant/link validation
-- foreign tenant on a dependent row
UPDATE payroll_period_notes SET tenant_id = '22222222-0000-0000-0000-000000000002' WHERE payroll_period_id = '50000000-0000-0000-0000-000000000005';
-- foreign employee on a ledger row of period 6
UPDATE holiday_ledger SET employee_id = 'eb000000-0000-0000-0000-00000000000b' WHERE source_id = 'ac000600-0000-0000-0000-000000000001';
-- period 7 : overpayment from period 8 says it was recovered in period 7
UPDATE payroll_overpayments SET recovered_in_period_id = '50000000-0000-0000-0000-000000000007' WHERE payroll_period_id = '50000000-0000-0000-0000-000000000008';
SET ROLE authenticated;
SELECT t_err('foreign tenant_id on a note refused', $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000005', gen_random_uuid(), NULL)$$, 'another workspace');
SELECT t_err('foreign-employee ledger row refused', $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000006', gen_random_uuid(), NULL)$$, 'outside this workspace');
SELECT t_err('cross-period overpayment refused', $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000007', gen_random_uuid(), NULL)$$, 'another period is recorded as recovered');
RESET ROLE;
SELECT t('validation refusals changed nothing', (SELECT count(*) FROM payroll_periods WHERE id IN
  ('50000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000007')) = 3
  AND (SELECT count(*) FROM payroll_period_recoveries) = 0);
-- put period 8 back so it can be used later
UPDATE payroll_overpayments SET recovered_in_period_id = '50000000-0000-0000-0000-000000000008' WHERE payroll_period_id = '50000000-0000-0000-0000-000000000008';

-- ================================================================ private recovery table
SET ROLE authenticated;
SELECT t_err('app users cannot read recoveries', $$SELECT * FROM payroll_period_recoveries$$, 'permission denied');
SELECT t_err('app users cannot insert recoveries',
  $$INSERT INTO payroll_period_recoveries(tenant_id, period_id, period_name, request_id, deleted_by, restore_expires_at, counts, snapshot, snapshot_sha256)
    VALUES ('11111111-0000-0000-0000-000000000001', gen_random_uuid(), 'x', gen_random_uuid(), gen_random_uuid(), now() + interval '1h', '{}', '{}', 'x')$$, 'permission denied');

-- ================================================================ draft delete success
SELECT t('draft delete returns a recovery id', (delete_draft_payroll_period('50000000-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', 'rebuild') ->> 'recovery_id') IS NOT NULL);
RESET ROLE;
SELECT t('period removed', NOT EXISTS (SELECT 1 FROM payroll_periods WHERE id = '50000000-0000-0000-0000-000000000001'));
SELECT t('entries, splits, adjustments, nmw, notes, payments, overpayments removed',
  (SELECT count(*) FROM payroll_entries WHERE payroll_period_id = '50000000-0000-0000-0000-000000000001')
 + (SELECT count(*) FROM payroll_entry_locations WHERE payroll_period_id = '50000000-0000-0000-0000-000000000001')
 + (SELECT count(*) FROM payroll_adjustments WHERE payroll_period_id = '50000000-0000-0000-0000-000000000001')
 + (SELECT count(*) FROM payroll_nmw_audit WHERE payroll_period_id = '50000000-0000-0000-0000-000000000001')
 + (SELECT count(*) FROM payroll_period_notes WHERE payroll_period_id = '50000000-0000-0000-0000-000000000001')
 + (SELECT count(*) FROM holiday_payments WHERE payroll_period_id = '50000000-0000-0000-0000-000000000001')
 + (SELECT count(*) FROM payroll_overpayments WHERE payroll_period_id = '50000000-0000-0000-0000-000000000001') = 0);
SELECT t('ledger row reversed', NOT EXISTS (SELECT 1 FROM holiday_ledger WHERE id = 'af000100-0000-0000-0000-000000000001'));
SELECT t('timesheet import kept as unlinked evidence', EXISTS (SELECT 1 FROM payroll_imports WHERE id = 'bb000100-0000-0000-0000-000000000001' AND payroll_period_id IS NULL));
SELECT t('admin note kept as unlinked evidence', EXISTS (SELECT 1 FROM admin_notes WHERE id = 'cc000100-0000-0000-0000-000000000001' AND payroll_period_id IS NULL));
SELECT t('counts recorded for every table', (SELECT counts FROM payroll_period_recoveries WHERE request_id = '99999999-0000-0000-0000-000000000001')
  = '{"entries":2,"entryLocations":2,"adjustments":1,"nmwAudit":1,"notes":1,"holidayPayments":1,"holidayLedger":1,"overpayments":1,"imports":1,"adminNotes":1}'::jsonb);
SELECT t('audit log holds a summary, no snapshot', (SELECT old_data IS NULL AND new_data->>'operation' = 'delete_draft_period'
  FROM audit_log WHERE record_id = '50000000-0000-0000-0000-000000000001' AND action = 'delete'));
SET ROLE authenticated;
SELECT t('banner lists the deletion', (SELECT count(*) FROM list_restorable_payroll_deletions('11111111-0000-0000-0000-000000000001')) = 1);
SELECT as_user('b0000000-0000-0000-0000-00000000000b');
SELECT t('other workspace sees nothing in the list', (SELECT count(*) FROM list_restorable_payroll_deletions('11111111-0000-0000-0000-000000000001')) = 0);

-- ================================================================ retries
SELECT as_user('a0000000-0000-0000-0000-00000000000a');
SELECT t('same request id is idempotent', (delete_draft_payroll_period('50000000-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000001', 'rebuild') ->> 'already_done')::boolean);
SELECT t_err('same request id for another period refused', $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000008', '99999999-0000-0000-0000-000000000001', NULL)$$, 'different deletion');
SELECT t_err('new request id on deleted period refused', $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000001', gen_random_uuid(), NULL)$$, 'not found');
RESET ROLE;
SELECT t('only one recovery row after retries', (SELECT count(*) FROM payroll_period_recoveries) = 1);

-- ================================================================ forged audit record
INSERT INTO audit_log(user_id, action, table_name, record_id, tenant_id, old_data, new_data)
VALUES ('a0000000-0000-0000-0000-00000000000a', 'delete', 'payroll_periods', '5f000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
  '{"period":{"id":"5f000000-0000-0000-0000-000000000001","tenant_id":"11111111-0000-0000-0000-000000000001","period_name":"Forged","start_date":"2025-01-01","end_date":"2025-01-28","status":"draft"}}',
  '{"operation":"delete_draft_period"}');
SET ROLE authenticated;
SELECT t_err('forged audit id cannot be restored', $$SELECT restore_draft_payroll_period((SELECT id FROM audit_log WHERE record_id = '5f000000-0000-0000-0000-000000000001'))$$, 'no recoverable');
SELECT t('forged audit record not listed', (SELECT count(*) FROM list_restorable_payroll_deletions('11111111-0000-0000-0000-000000000001')) = 1);
RESET ROLE;
SELECT t('forged period not created', NOT EXISTS (SELECT 1 FROM payroll_periods WHERE id = '5f000000-0000-0000-0000-000000000001'));

-- ================================================================ restore
SET ROLE authenticated;
SELECT as_user('b0000000-0000-0000-0000-00000000000b');
SELECT t_err('other workspace admin cannot restore', $$SELECT restore_draft_payroll_period((SELECT recovery_id FROM list_restorable_payroll_deletions('11111111-0000-0000-0000-000000000001') LIMIT 1))$$, 'no recoverable|null');
RESET ROLE;
DO $$ BEGIN PERFORM set_config('t.rid', (SELECT id::text FROM payroll_period_recoveries WHERE request_id = '99999999-0000-0000-0000-000000000001'), false); END $$;
SET ROLE authenticated;
SELECT t_err('other workspace admin cannot restore by id', format('SELECT restore_draft_payroll_period(%L)', current_setting('t.rid')), 'company administrator');
SELECT as_user('d0000000-0000-0000-0000-00000000000d');
SELECT t_err('platform administrator cannot restore', format('SELECT restore_draft_payroll_period(%L)', current_setting('t.rid')), 'company administrator');
SELECT as_user('a0000000-0000-0000-0000-00000000000a');
SELECT t('restore succeeds', (restore_draft_payroll_period(current_setting('t.rid')::uuid) ->> 'already_done')::boolean = false);
RESET ROLE;
SELECT t('restored byte-identical (ids, amounts, dates, ledger, overpayment, evidence links)',
  t_fingerprint('50000000-0000-0000-0000-000000000001') = (SELECT fp1 FROM t_state));
SELECT t('overpayment recovery details intact', EXISTS (SELECT 1 FROM payroll_overpayments WHERE id = 'a0000100-0000-0000-0000-00000000000f'
  AND recovery_status = 'recovered' AND recovered_amount = 73.26 AND recovered_in_period_id = '50000000-0000-0000-0000-000000000001'));
SELECT t('holiday balance back to its pre-delete value', (SELECT sum(hours) FROM holiday_ledger WHERE employee_id = 'e2000000-0000-0000-0000-000000000002') = (SELECT bal_e2 FROM t_state));
SELECT t('stored totals restored', EXISTS (SELECT 1 FROM payroll_periods WHERE id = '50000000-0000-0000-0000-000000000001' AND incentives_total = 25.5 AND holidays_total = 88.8 AND sales_total = 1000));
SELECT t('both audit entries kept', (SELECT count(*) FROM audit_log WHERE record_id = '50000000-0000-0000-0000-000000000001' AND new_data->>'operation' IN ('delete_draft_period','restore_draft_period')) = 2);
SET ROLE authenticated;
SELECT t('restore retry is idempotent', (restore_draft_payroll_period(current_setting('t.rid')::uuid) ->> 'already_done')::boolean);
SELECT t('banner clears after restore', (SELECT count(*) FROM list_restorable_payroll_deletions('11111111-0000-0000-0000-000000000001')) = 0);
SELECT t('restored period can be deleted again', (delete_draft_payroll_period('50000000-0000-0000-0000-000000000001', '99999999-0000-0000-0000-000000000002', NULL) ->> 'recovery_id') IS NOT NULL);

-- ================================================================ restore refusals
RESET ROLE;
SELECT t_err('snapshot cannot be edited', $$UPDATE payroll_period_recoveries SET snapshot = '{}' WHERE request_id = '99999999-0000-0000-0000-000000000002'$$, 'cannot be changed');
SELECT t_err('recovery cannot be deleted', $$DELETE FROM payroll_period_recoveries$$, 'permanent');
SELECT t_err('recovery table cannot be truncated', $$TRUNCATE payroll_period_recoveries$$, 'permanent');

-- relinked evidence: attach the kept import to period 8, restore must refuse
UPDATE payroll_imports SET payroll_period_id = '50000000-0000-0000-0000-000000000008' WHERE id = 'bb000100-0000-0000-0000-000000000001';
DO $$ BEGIN PERFORM set_config('t.rid2', (SELECT id::text FROM payroll_period_recoveries WHERE request_id = '99999999-0000-0000-0000-000000000002'), false); END $$;
SET ROLE authenticated;
SELECT t_err('relinked evidence refuses restore', format('SELECT restore_draft_payroll_period(%L)', current_setting('t.rid2')), 'timesheet import');
RESET ROLE;
SELECT t('refused restore left nothing behind', NOT EXISTS (SELECT 1 FROM payroll_periods WHERE id = '50000000-0000-0000-0000-000000000001'));
UPDATE payroll_imports SET payroll_period_id = NULL WHERE id = 'bb000100-0000-0000-0000-000000000001';

-- tampered snapshot (simulated with the guard disabled, as a superuser could)
ALTER TABLE payroll_period_recoveries DISABLE TRIGGER trg_payroll_period_recoveries_guard;
UPDATE payroll_period_recoveries SET snapshot = jsonb_set(snapshot, '{entries,0,hourly_rate}', '99') WHERE request_id = '99999999-0000-0000-0000-000000000002';
SET ROLE authenticated;
SELECT t_err('tampered snapshot refused', format('SELECT restore_draft_payroll_period(%L)', current_setting('t.rid2')), 'integrity');
RESET ROLE;
UPDATE payroll_period_recoveries SET snapshot = jsonb_set(snapshot, '{entries,0,hourly_rate}', '12.21') WHERE request_id = '99999999-0000-0000-0000-000000000002';
-- expired window
UPDATE payroll_period_recoveries SET restore_expires_at = now() - interval '1 minute' WHERE request_id = '99999999-0000-0000-0000-000000000002';
SET ROLE authenticated;
SELECT t_err('restore after two hours refused', format('SELECT restore_draft_payroll_period(%L)', current_setting('t.rid2')), 'two-hour');
SELECT t('expired deletion not listed', (SELECT count(*) FROM list_restorable_payroll_deletions('11111111-0000-0000-0000-000000000001')) = 0);
RESET ROLE;
UPDATE payroll_period_recoveries SET restore_expires_at = now() + interval '2 hours' WHERE request_id = '99999999-0000-0000-0000-000000000002';
ALTER TABLE payroll_period_recoveries ENABLE TRIGGER trg_payroll_period_recoveries_guard;

-- rules recalculate a value differently -> restore refused, nothing half-done
UPDATE employees SET hourly_rate = hourly_rate WHERE false; -- placeholder: accrual depends on rules; simulate via entry trigger
CREATE OR REPLACE FUNCTION public.recalculate_total_pay() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN NEW.total_pay := 1; RETURN NEW; END $f$;
SET ROLE authenticated;
SELECT t_err('recalculated value mismatch refuses restore', format('SELECT restore_draft_payroll_period(%L)', current_setting('t.rid2')), 'differ from the snapshot');
RESET ROLE;
SELECT t('mismatch refusal left nothing behind', NOT EXISTS (SELECT 1 FROM payroll_periods WHERE id = '50000000-0000-0000-0000-000000000001')
  AND NOT EXISTS (SELECT 1 FROM payroll_entries WHERE payroll_period_id = '50000000-0000-0000-0000-000000000001'));
CREATE OR REPLACE FUNCTION public.recalculate_total_pay() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN
  NEW.total_pay := ROUND((NEW.timesheet_hours * NEW.hourly_rate) + (NEW.timesheet_hours * COALESCE(NEW.service_charge, 0))
    + COALESCE(NEW.performance_bonus, 0) + COALESCE(NEW.special_bonus, 0), 2);
  RETURN NEW;
END $f$;
SET ROLE authenticated;
SELECT t('restore works once the conflict is gone', (restore_draft_payroll_period(current_setting('t.rid2')::uuid) ->> 'already_done')::boolean = false);
RESET ROLE;
SELECT t('second restore byte-identical too', t_fingerprint('50000000-0000-0000-0000-000000000001') = (SELECT fp1 FROM t_state));

-- ================================================================ unknown dependent table
CREATE TABLE public.t_unknown_child (id uuid PRIMARY KEY, payroll_period_id uuid REFERENCES public.payroll_periods(id) ON DELETE CASCADE);
SET ROLE authenticated;
SELECT t_err('unknown dependent table refuses deletion', $$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000008', gen_random_uuid(), NULL)$$, 'depend on payroll');
RESET ROLE;
DROP TABLE public.t_unknown_child;
