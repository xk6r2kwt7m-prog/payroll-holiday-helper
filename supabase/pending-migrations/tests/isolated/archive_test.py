import h, subprocess
from h import *
h.DB='arch'
subprocess.run('psql -h /tmp/iso -p 55432 -U postgres -qc "DROP DATABASE IF EXISTS arch" -c "CREATE DATABASE arch TEMPLATE base"',shell=True,check=True)
ok('fixtures load', open('fixtures.sql').read())
A='11111111-1111-1111-1111-111111111111'; M='22222222-2222-2222-2222-222222222222'; S='33333333-3333-3333-3333-333333333333'; B='44444444-4444-4444-4444-444444444444'; SUP='55555555-5555-5555-5555-555555555555'
F="'f0000000-0000-0000-0000-00000000000f'"; C="'c0000000-0000-0000-0000-00000000000c'"; MAR="'90000000-0000-0000-0000-000000000009'"
FP="""SELECT md5(concat_ws('|',
 (SELECT to_jsonb(p)::text FROM payroll_periods p WHERE id=%s),
 (SELECT string_agg(to_jsonb(x)::text,',' ORDER BY id) FROM payroll_entries x WHERE payroll_period_id=%s),
 (SELECT string_agg(to_jsonb(x)::text,',' ORDER BY id) FROM holiday_payments x WHERE payroll_period_id=%s),
 (SELECT string_agg(to_jsonb(x)::text,',' ORDER BY id) FROM payroll_imports x WHERE payroll_period_id=%s),
 (SELECT string_agg(to_jsonb(x)::text,',' ORDER BY id) FROM payroll_overpayments x WHERE payroll_period_id=%s),
 (SELECT string_agg(to_jsonb(x)::text,',' ORDER BY id) FROM holiday_ledger x),
 (SELECT string_agg(to_jsonb(x)::text,',' ORDER BY id) FROM audit_log x WHERE record_id=%s)))"""
fp=lambda p: val(FP%((p,)*6))
# second archived fixture WITH entries, to prove recalculation of entries/ledger is blocked: archive March copy later
ok('install archive change', open('/dev-server/supabase/pending-migrations/20260926150000_payroll_period_archive.proposed.sql').read())
before=fp(F); stored=val(f"SELECT concat_ws('/',timesheet_total,incentives_total,holidays_total,grand_total,status,updated_at) FROM payroll_periods WHERE id={F}")
check('installing archives nothing', val('SELECT count(*) FROM payroll_period_archives')=='0')
check('installing leaves the Feb-like period unchanged', fp(F)==before)
ua=val(f"SELECT updated_at FROM payroll_periods WHERE id={F}")
arch=lambda u,t=ua,r="'Superseded by Feb TEST Corrected'": sql(f"SELECT archive_payroll_period({F},{r},'Tester','{t}')",u)
for n,u in [('signed-out','anon'),('staff',S),('supervisor',SUP),('manager',M),('other-workspace admin',B)]:
    rc,o,e=arch(u); check(f'{n} cannot archive', rc!=0 and ('administrator' in e or 'permission denied' in e), o+e)
rc,o,e=arch(A,'2020-01-01 00:00+00'); check('stale review refused', rc!=0 and 'changed since' in e, e)
rc,o,e=arch(A,r="''"); check('reason required', rc!=0, e)
check('refusals archived nothing and changed nothing', val('SELECT count(*) FROM payroll_period_archives')=='0' and fp(F)==before)
# forced failure mid-archive: audit insert fails -> nothing kept
sql("CREATE FUNCTION public.t_fail() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'forced failure'; END$$; CREATE TRIGGER t_fail BEFORE INSERT ON audit_log FOR EACH ROW WHEN (NEW.table_name='payroll_period_archives') EXECUTE FUNCTION t_fail();")
rc,o,e=arch(A); check('forced failure during archive leaves no archive record', rc!=0 and val('SELECT count(*) FROM payroll_period_archives')=='0' and fp(F)==before, e)
sql("DROP TRIGGER t_fail ON audit_log")
rc,o,e=arch(A); check('admin archives', rc==0 and '"already_archived": false' in o, o+e)
rc,o,e=arch(A); check('repeat is a safe no-op', rc==0 and '"already_archived": true' in o, o+e)
check('archive did not touch the period row (status, dates, all four totals, updated_at)', val(f"SELECT concat_ws('/',timesheet_total,incentives_total,holidays_total,grand_total,status,updated_at) FROM payroll_periods WHERE id={F}")==stored)
check('stored holiday total still 7660.35', val(f"SELECT holidays_total FROM payroll_periods WHERE id={F}")=='7660.35')
check('snapshot + counts recorded', val(f"SELECT period_snapshot->>'holidays_total' || '/' || (child_counts->>'payroll_overpayments') || '/' || (child_counts->>'audit_log') FROM payroll_period_archives")=='7660.35/3/2')
check('exactly one new audit entry', val(f"SELECT count(*) FROM audit_log WHERE table_name='payroll_period_archives'")=='1')
after=fp(F)
attempts={
 'screen edit of name':f"UPDATE payroll_periods SET period_name='x' WHERE id={F}",
 'browser recalculation (holidays/grand from sums)':f"UPDATE payroll_periods SET holidays_total=0, grand_total=0 WHERE id={F}",
 'approve':f"UPDATE payroll_periods SET status='approved' WHERE id={F}",
 'touch updated_at only':f"UPDATE payroll_periods SET updated_at=now() WHERE id={F}",
 'delete period':f"DELETE FROM payroll_periods WHERE id={F}",
 'delete/undo action':f"SELECT delete_draft_payroll_period({F},gen_random_uuid(),'test')",
 'add entry (would trigger total recalculation)':f"INSERT INTO payroll_entries(tenant_id,payroll_period_id,employee_id,hourly_rate,timesheet_hours) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a',{F},'e1000000-0000-0000-0000-000000000001',12.21,1)",
 'add holiday payment':f"INSERT INTO holiday_payments(tenant_id,payroll_period_id,employee_name,rate,hours,total) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a',{F},'x',1,1,1)",
 'add adjustment':f"INSERT INTO payroll_adjustments(tenant_id,payroll_period_id,payroll_entry_id,employee_id,field_name,old_value,new_value,note) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a',{F},'ee000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','x','1','2','test reason long enough')",
 'add note':f"INSERT INTO payroll_period_notes(tenant_id,payroll_period_id,note) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a',{F},'x')",
 'edit import':f"UPDATE payroll_imports SET file_name='y' WHERE payroll_period_id={F}",
 'move import out':f"UPDATE payroll_imports SET payroll_period_id={C} WHERE payroll_period_id={F}",
 'delete overpayments':f"DELETE FROM payroll_overpayments WHERE payroll_period_id={F}",
 'move overpayment out':f"UPDATE payroll_overpayments SET payroll_period_id={C} WHERE payroll_period_id={F}",
 'add overpayment':f"INSERT INTO payroll_overpayments(tenant_id,payroll_period_id,employee_id,overlap_start_date,overlap_end_date,hourly_rate) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a',{F},'e1000000-0000-0000-0000-000000000001','2026-01-19','2026-01-20',1)",
 'record a recovery INTO the archived period':f"UPDATE payroll_overpayments SET recovered_in_period_id={F} WHERE payroll_period_id={F}",
}
for n,q in attempts.items():
    for who,u in [('admin',A),('server job','service')]:
        rc,o,e=sql(q,u); check(f'{who}: {n} refused', rc!=0 and ('archived' in e or (n=='delete/undo action' and ('Deletion refused' in e or 'permission denied' in e))), o+e)
check('all refused attempts left period, children, ledger and audit unchanged', fp(F)==after)
ok('archive record cannot be edited', "SELECT 1", None)
for n,q in [('update',"UPDATE payroll_period_archives SET reason='x'"),('delete','DELETE FROM payroll_period_archives'),('truncate','TRUNCATE payroll_period_archives')]:
    for who,u in [('admin',A),('server job','service'),('database owner',None)]:
        rc,o,e=sql(q,u); check(f'{who}: archive record {n} refused', rc!=0 and ('permanent' in e or 'permission denied' in e), e)
rc,o,e=sql(f"UPDATE payroll_overpayments SET recovered_in_period_id={C} WHERE payroll_period_id={F}",'service'); check('recovery can still be recorded in the corrected period', rc==0, e)
# March with entries: archive it and prove entry edits + accrual back-fill refused
ok('entry trigger works before archive', f"UPDATE payroll_entries SET timesheet_hours=101 WHERE id='ee000000-0000-0000-0000-000000000001'", A)
mar_ts=val(f"SELECT timesheet_total FROM payroll_periods WHERE id={MAR}")
ua2=val(f"SELECT updated_at FROM payroll_periods WHERE id={MAR}")
rc,o,e=sql(f"SELECT archive_payroll_period({MAR},'test archive with entries','Tester','{ua2}')",A); check('archive a period with entries', rc==0, e)
m_before=fp(MAR)
for n,q in [('edit hours',f"UPDATE payroll_entries SET timesheet_hours=1 WHERE payroll_period_id={MAR}"),('delete entry',f"DELETE FROM payroll_entries WHERE payroll_period_id={MAR}"),
            ('ledger row sourced from archived entry',"INSERT INTO holiday_ledger(employee_id,tenant_id,leave_year_start,entry_date,entry_type,hours,source_table,source_id) VALUES('e1000000-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','2026-01-01','2026-03-01','accrual',1,'payroll_entries','ee000000-0000-0000-0000-000000000001')")]:
    for who,u in [('admin',A),('server job','service')]:
        rc,o,e=sql(q,u); check(f'{who}: archived period {n} refused', rc!=0 and 'archived' in e, o+e)
sql("SELECT ensure_accrual_ledger_for_entry('ee000000-0000-0000-0000-000000000001')",'service')
check('archived period with entries unchanged (incl. after accrual back-fill call); timesheet total kept', fp(MAR)==m_before and val(f"SELECT timesheet_total FROM payroll_periods WHERE id={MAR}")==mar_ts)
rc,o,e=sql(f"INSERT INTO payroll_entries(tenant_id,payroll_period_id,employee_id,hourly_rate,timesheet_hours) VALUES('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a',{C},'e1000000-0000-0000-0000-000000000001',12.21,10)",A)
check('other periods still editable and recalculate as today', rc==0 and val(f"SELECT timesheet_total||'/'||grand_total FROM payroll_periods WHERE id={C}")=='122.10/122.10', e)
check('reading archived period works for admin', val(f"SELECT count(*) FROM payroll_period_archives",A)=='2')
check('manager cannot read archive records', val(f"SELECT count(*) FROM payroll_period_archives",M)=='0')
# rollback
keep=fp(F)
ok('undo script runs', open('/dev-server/supabase/pending-migrations/rollback/20260926150000_payroll_period_archive.down.sql').read())
check('undo changes no payroll data and keeps archive + audit evidence', fp(F)==keep and val('SELECT count(*) FROM payroll_period_archives')=='2')
check('after undo, archived-period edits work again (proves guards removed)', sql(f"BEGIN; UPDATE payroll_periods SET period_name='x' WHERE id={F}; ROLLBACK;",A)[0]==0)
ok('re-install after undo', open('/dev-server/supabase/pending-migrations/20260926150000_payroll_period_archive.proposed.sql').read().replace('CREATE TABLE public.payroll_period_archives','CREATE TABLE IF NOT EXISTS public.payroll_period_archives').replace('CREATE POLICY payroll_archive_admin_read','DROP POLICY IF EXISTS payroll_archive_admin_read ON public.payroll_period_archives; CREATE POLICY payroll_archive_admin_read').replace('CREATE TRIGGER trg_payroll_period_archives_','DROP TRIGGER IF EXISTS trg_payroll_period_archives_immutable ON payroll_period_archives; DROP TRIGGER IF EXISTS trg_payroll_period_archives_no_truncate ON payroll_period_archives; CREATE TRIGGER trg_payroll_period_archives_',1).replace("CREATE TRIGGER trg_payroll_period_archives_no_truncate","CREATE TRIGGER trg_payroll_period_archives_no_truncate"))
check('re-installed guards protect existing archives immediately', sql(f"UPDATE payroll_periods SET period_name='x' WHERE id={F}",A)[0]!=0)
print('ARCHIVE', R)
