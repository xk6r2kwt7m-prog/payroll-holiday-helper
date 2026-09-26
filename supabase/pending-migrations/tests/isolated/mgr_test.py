import h, subprocess
from h import *
h.DB='mr'; PM='/dev-server/supabase/pending-migrations/'
subprocess.run('psql -h /tmp/iso -p 55432 -U postgres -qc "DROP DATABASE IF EXISTS mr" -c "CREATE DATABASE mr TEMPLATE base"',shell=True,check=True)
ok('fixtures', open('fixtures.sql').read())
T='aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'; A='11111111-1111-1111-1111-111111111111'; M='22222222-2222-2222-2222-222222222222'; SUP='55555555-5555-5555-5555-555555555555'; B='44444444-4444-4444-4444-444444444444'
E1='e1000000-0000-0000-0000-000000000001'; E2='e2000000-0000-0000-0000-000000000002'
ok('branch scope: manager in Carnaby-test; E1 Carnaby-test, E2 Brixton-test', f"""
 INSERT INTO employees(id,tenant_id,forename,surname,department,hourly_rate,user_id) VALUES('e3000000-0000-0000-0000-000000000003','{T}','Mgr','Test','FOH',15,'{M}');
 INSERT INTO employee_branches(employee_id,branch,tenant_id) VALUES('e3000000-0000-0000-0000-000000000003','Carnaby-test','{T}'),('{E1}','Carnaby-test','{T}'),('{E2}','Brixton-test','{T}');
 UPDATE employees SET date_of_birth='1990-01-01', ni_number='QQ123456C', passport_no='P000001', nationality='Testland' WHERE id='{E1}';""")
rows=[('c1','forename','Testa','Newname',False,E1),('c2','ni_number','QQ123456C','QQ654321C',True,E1),('c3','date_of_birth','1990-01-01','1991-01-01',False,E1),
      ('c4','email','testa@example.test','new@example.test',False,E1),('c5','surname','Other','Changed',False,E2),('c6','passport_no','P000001','P999999',True,E1),
      ('c7','nationality','Testland','Otherland',False,E1),('c8','settlement_status',None,'settled',False,E1),('c9','preferred_name',None,'Tess',False,E1)]
ids={}
for i,(k,f,o,n,s,e) in enumerate(rows):
    ids[k]=f'c1000000-0000-0000-0000-00000000000{i+1}'
    ok('submission '+k, f"INSERT INTO staff_detail_changes(id,tenant_id,employee_id,section,field_name,field_label,old_value,new_value,sensitive,needs_review,state) VALUES('{ids[k]}','{T}','{e}','personal','{f}','{f}',{('NULL' if o is None else repr(o))},'{n}',{s},true,'pending')")
ok('install staff approvals (20260926110000)', open(PM+'20260926110000_atomic_staff_approvals.sql').read())
ok('install manager amendment', open(PM+'20260926110500_manager_ordinary_staff_review.proposed.sql').read())
FP="SELECT md5(concat((SELECT string_agg(to_jsonb(x)::text,'' ORDER BY id) FROM employees x),(SELECT string_agg(to_jsonb(x)::text,'' ORDER BY id) FROM staff_detail_changes x),(SELECT count(*) FROM audit_log)::text,(SELECT count(*) FROM bank_detail_verifications)::text))"
d=lambda k,u,acc='true': sql(f"SELECT decide_staff_detail_atomic('{ids[k]}',{acc},'Tester','n')",u)
check('manager can read ordinary submissions only (RLS)', val("SELECT string_agg(field_name,',' ORDER BY field_name) FROM staff_detail_changes",M)=='date_of_birth,email,forename,nationality,preferred_name,settlement_status', val("SELECT string_agg(field_name,',') FROM staff_detail_changes",M))
for k,why in [('c2','NI number (protected)'),('c6','passport (protected)'),('c3','date of birth'),('c8','settlement status'),('c5','employee outside manager branch')]:
    for acc in ('true','false'):
        b=val(FP); rc,o,e=d(k,M,acc); check(f'manager {"accept" if acc=="true" else "reject"} refused: {why}', rc!=0 and 'administrator' in e and val(FP)==b, o+e)
for k in ('c1','c4','c7'):
    rc,o,e=d(k,M); check(f'manager accepts ordinary {k}', rc==0, e)
rc,o,e=d('c9',M,'false'); check('manager rejects ordinary preferred name', rc==0, e)
check('accepted values applied, rejected not', val(f"SELECT concat_ws('/',forename,email,nationality,coalesce(preferred_name,'-')) FROM employees WHERE id='{E1}'")=='Newname/new@example.test/Otherland/-')
check('each manager decision audited once', val("SELECT count(*) FROM audit_log WHERE table_name='staff_detail_changes'")=='4')
for n,u in [('supervisor',SUP),('other-workspace admin',B),('signed out','anon')]:
    b=val(FP); rc,o,e=d('c5',u); check(f'{n} refused', rc!=0 and val(FP)==b, e)
for k in ('c2','c3','c5','c6','c8'):
    rc,o,e=d(k,A); check(f'administrator still decides {k}', rc==0, e)
rc,o,e=sql("SELECT confirm_staff_bank_atomic(ARRAY[]::uuid[],'x')",M); check('manager still cannot confirm bank details', rc!=0, e)
ok('undo amendment', open(PM+'rollback/20260926110500_manager_ordinary_staff_review.down.sql').read())
check('undo restores the reviewed 20260926110000 function exactly', val("SELECT md5(pg_get_functiondef('public.decide_staff_detail_atomic'::regproc))")==(lambda: (subprocess.run('psql -h /tmp/iso -p 55432 -U postgres -qc "DROP DATABASE IF EXISTS mr2" -c "CREATE DATABASE mr2 TEMPLATE base"',shell=True), sql(open(PM+'20260926110000_atomic_staff_approvals.sql').read(),db='mr2'), sql("SELECT md5(pg_get_functiondef('public.decide_staff_detail_atomic'::regproc))",db='mr2')[1])[-1])())
check('undo kept all decisions and audit', val("SELECT count(*) FROM staff_detail_changes WHERE state<>'pending'")=='9' and val("SELECT count(*) FROM audit_log WHERE table_name='staff_detail_changes'")=='9')
print('MANAGER', R)
