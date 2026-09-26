import h, subprocess, json
from h import *
PM='/dev-server/supabase/pending-migrations/'
def mk(db, extra=[]):
    subprocess.run(f'psql -h /tmp/iso -p 55432 -U postgres -qc "DROP DATABASE IF EXISTS {db}" -c "CREATE DATABASE {db} TEMPLATE base"',shell=True,check=True)
    rc,o,e=sql(open('fixtures.sql').read(),db=db); assert rc==0,e
    sql("UPDATE payroll_periods SET timesheet_total=500.00 WHERE id='c0000000-0000-0000-0000-00000000000c'",db=db)  # stored value differing from entries (historical style)
    for f in extra:
        rc,o,e=sql(open(f).read(),db=db); assert rc==0,(f,e)
mk('hb'); mk('h1',[PM+'20260925090010_atomic_holiday_payments_saving_only.proposed.sql'])
A='11111111-1111-1111-1111-111111111111'; T='aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'
MAR='90000000-0000-0000-0000-000000000009'; C='c0000000-0000-0000-0000-00000000000c'
E1='e1000000-0000-0000-0000-000000000001'; E2='e2000000-0000-0000-0000-000000000002'
def period_state(db):
    return sql("SELECT string_agg(concat_ws('/',id,timesheet_total,incentives_total,holidays_total,grand_total),' ; ' ORDER BY id) FROM payroll_periods",db=db)[1]
def ledger_state(db):
    return sql("SELECT string_agg(concat_ws('/',employee_id,entry_type,hours::float8,amount::float8,source_id),' ; ' ORDER BY source_id,entry_type) FROM holiday_ledger",db=db)[1]
RECALC="""UPDATE payroll_periods SET holidays_total=(SELECT coalesce(sum(total),0) FROM holiday_payments WHERE payroll_period_id='{p}'),
 grand_total=(SELECT coalesce(sum(total_pay),0) FROM payroll_entries WHERE payroll_period_id='{p}')+(SELECT coalesce(sum(total),0) FROM holiday_payments WHERE payroll_period_id='{p}') WHERE id='{p}';"""
def old_app(op, pid, payid, emp=None, hours=None, rate=None, date='2026-03-02'):
    # Exactly what the pre-change browser code did: write payment, write/adjust ledger, then recalcPayrollPeriodTotals.
    if op=='create':
        q=f"""INSERT INTO holiday_payments(id,tenant_id,payroll_period_id,employee_id,employee_name,hours,rate,total,holiday_taken_date)
          VALUES('{payid}','{T}','{pid}','{emp}','x',{hours},{rate},round({hours}*{rate},2),'{date}');
          INSERT INTO holiday_ledger(employee_id,tenant_id,leave_year_start,entry_date,entry_type,hours,amount,source_table,source_id)
          VALUES('{emp}','{T}','2026-01-01','{date}','holiday_taken',-{hours},-round({hours}*{rate},2),'holiday_payments','{payid}');"""
    elif op=='update':
        q=f"""UPDATE holiday_payments SET hours={hours},rate={rate},total=round({hours}*{rate},2) WHERE id='{payid}';
          UPDATE holiday_ledger SET hours=-{hours},amount=-round({hours}*{rate},2) WHERE source_id='{payid}';"""
    else:
        q=f"DELETE FROM holiday_ledger WHERE source_id='{payid}'; DELETE FROM holiday_payments WHERE id='{payid}';"
    return sql(q+RECALC.format(p=pid),db='hb')
def new_app(op, pid, payid, emp=None, hours=None, rate=None, date='2026-03-02'):
    vals={} if op=='delete' else {'hours':hours,'rate':rate,'total':round(hours*rate+1e-9,2),'holiday_taken_date':date}
    if op=='create': vals.update(employee_id=emp,payroll_period_id=pid)
    return sql(f"SELECT mutate_holiday_payment_atomic('{T}',gen_random_uuid(),'{op}','{payid}','{json.dumps(vals)}'::jsonb)",A,db='h1')
check('starting totals identical', period_state('hb')==period_state('h1'), period_state('hb')+' vs '+period_state('h1'))
steps=[('create',MAR,'ab000000-0000-0000-0000-000000000001',E1,8,12.21),('create',C,'ab000000-0000-0000-0000-000000000002',E2,4,13.00),
       ('create',MAR,'ab000000-0000-0000-0000-000000000003',E2,7.5,13.00),('update',MAR,'ab000000-0000-0000-0000-000000000001',E1,10,12.21),
       ('delete',C,'ab000000-0000-0000-0000-000000000002'),('entry',MAR,None),('create',MAR,'ab000000-0000-0000-0000-000000000004',E1,12.07,12.71),('delete',MAR,'ab000000-0000-0000-0000-000000000003')]
for s in steps:
    if s[0]=='entry':
        for db in ('hb','h1'): sql(f"UPDATE payroll_entries SET timesheet_hours=120 WHERE id='ee000000-0000-0000-0000-000000000001'",A,db=db)
        name='payroll entry edited (existing entry rule: grand = timesheet only)'
    else:
        r1=old_app(*s); r2=new_app(*s); name=f'{s[0]} {s[4] if len(s)>4 else ""}h in {"March" if s[1]==MAR else "Dec"}'
        check(name+': both ways succeed', r1[0]==0 and r2[0]==0, r1[2]+' | '+r2[2])
    a,b=period_state('hb'),period_state('h1')
    check(name+': period totals identical to today\'s rule', a==b, a+'  VS  '+b)
    check(name+': holiday ledger identical', ledger_state('hb')==ledger_state('h1'), ledger_state('hb')+' VS '+ledger_state('h1'))
check('stored timesheet total not rewritten by holiday saves (Dec kept 500.00)', sql(f"SELECT timesheet_total FROM payroll_periods WHERE id='{C}'",db='h1')[1]=='500.00')
check('incentives_total never touched', sql("SELECT count(*) FROM payroll_periods WHERE incentives_total<>0",db='h1')[1]=='0')
check('holiday pay counted once in grand total', sql(f"SELECT grand_total = (SELECT sum(total_pay) FROM payroll_entries WHERE payroll_period_id='{MAR}') + holidays_total FROM payroll_periods WHERE id='{MAR}'",db='h1')[1]=='t')
check('entry trigger unchanged: function text identical to baseline', sql("SELECT md5(pg_get_functiondef('public.sync_payroll_period_totals'::regproc))",db='hb')[1]==sql("SELECT md5(pg_get_functiondef('public.sync_payroll_period_totals'::regproc))",db='h1')[1])
# concurrency: 12 simultaneous saves
procs=[]
for i in range(12):
    vals={'employee_id':E1 if i%2 else E2,'payroll_period_id':MAR,'hours':1+i,'rate':12.5,'total':round((1+i)*12.5,2),'holiday_taken_date':'2026-03-05'}
    pre=f"SELECT set_config('request.jwt.claims','{json.dumps({'sub':A,'role':'authenticated'})}',false); SET ROLE authenticated;"
    procs.append(subprocess.Popen(['psql','-h','/tmp/iso','-p','55432','-U','postgres','-d','h1','-qAt','-c',pre+f"SELECT mutate_holiday_payment_atomic('{T}',gen_random_uuid(),'create','ac000000-0000-0000-0000-{i:012d}','{json.dumps(vals)}'::jsonb)"],stdout=subprocess.PIPE,stderr=subprocess.PIPE))
rcs=[p.wait() for p in procs]
check('12 concurrent saves all succeed', rcs.count(0)==12, str(rcs))
check('after concurrent saves: holiday total = sum of payments, grand = entries + holidays', sql(f"""SELECT holidays_total=(SELECT sum(total) FROM holiday_payments WHERE payroll_period_id='{MAR}')
  AND grand_total=(SELECT sum(total_pay) FROM payroll_entries WHERE payroll_period_id='{MAR}')+holidays_total FROM payroll_periods WHERE id='{MAR}'""",db='h1')[1]=='t')
check('one ledger debit per payment after concurrency', sql("SELECT count(*)=count(DISTINCT source_id) AND count(*)=(SELECT count(*) FROM holiday_payments) FROM holiday_ledger WHERE source_table='holiday_payments'",db='h1')[1]=='t')
# approved lock
sql(f"UPDATE payroll_periods SET status='approved' WHERE id='{C}'",db='h1')
rc,o,e=new_app('create',C,'ad000000-0000-0000-0000-000000000001',E1,2,12.21); check('approved period refuses holiday save', rc!=0 and ('locked' in e.lower() or 'reopen' in e.lower()), e)
# forced failure mid-save
sql("CREATE FUNCTION public.t_fail() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'forced'; END$$; CREATE TRIGGER t_fail BEFORE INSERT ON holiday_payment_operations FOR EACH ROW EXECUTE FUNCTION t_fail();",db='h1')
b=period_state('h1')+ledger_state('h1')
rc,o,e=new_app('create',MAR,'ad000000-0000-0000-0000-000000000002',E1,3,12.21)
check('forced failure at the last step leaves payment, ledger and totals unchanged', rc!=0 and period_state('h1')+ledger_state('h1')==b and sql("SELECT count(*) FROM holiday_payments WHERE id='ad000000-0000-0000-0000-000000000002'",db='h1')[1]=='0', e)
sql("DROP TRIGGER t_fail ON holiday_payment_operations",db='h1')
# H1 + H2 == original combined change
mk('horig',[PM+'20260925090000_atomic_holiday_payments.sql']); mk('h12',[PM+'20260925090010_atomic_holiday_payments_saving_only.proposed.sql',PM+'20260925090500_holiday_grand_total_rule.HELD.sql'])
FN="""SELECT md5(string_agg(p.proname||pg_get_functiondef(p.oid),'' ORDER BY p.proname)) FROM pg_proc p WHERE pronamespace='public'::regnamespace AND proname NOT LIKE 'gbt%' AND prokind='f'"""
TG="SELECT md5(string_agg(tgrelid::regclass||tgname||tgfoid::regproc,'' ORDER BY tgrelid::regclass::text, tgname)) FROM pg_trigger WHERE NOT tgisinternal"
check('saving fix + held rule change together = original combined change (functions)', sql(FN,db='horig')[1]==sql(FN,db='h12')[1])
check('saving fix + held rule change together = original combined change (triggers)', sql(TG,db='horig')[1]==sql(TG,db='h12')[1])
# rollback of H1
data=sql("SELECT md5(concat((SELECT string_agg(to_jsonb(x)::text,'' ORDER BY id) FROM holiday_payments x),(SELECT string_agg(to_jsonb(x)::text,'' ORDER BY id) FROM holiday_ledger x),(SELECT string_agg(to_jsonb(x)::text,'' ORDER BY id) FROM payroll_periods x),(SELECT count(*) FROM holiday_payment_operations)::text))",db='h1')[1]
rc,o,e=sql(open(PM+'rollback/20260925090010_atomic_holiday_payments_saving_only.down.sql').read(),db='h1'); check('saving-fix undo runs', rc==0, e)
check('undo keeps every payment, ledger entry, total and receipt', sql("SELECT md5(concat((SELECT string_agg(to_jsonb(x)::text,'' ORDER BY id) FROM holiday_payments x),(SELECT string_agg(to_jsonb(x)::text,'' ORDER BY id) FROM holiday_ledger x),(SELECT string_agg(to_jsonb(x)::text,'' ORDER BY id) FROM payroll_periods x),(SELECT count(*) FROM holiday_payment_operations)::text))",db='h1')[1]==data)
FN2=FN.replace("prokind='f'","prokind='f' AND proname<>'t_fail'")
check('undo restores functions exactly as before', sql(FN2,db='h1')[1]==sql(FN2,db='hb')[1])
check('undo restores triggers exactly as before', sql(TG,db='h1')[1]==sql(TG,db='hb')[1])
print('HOLIDAY', R)
