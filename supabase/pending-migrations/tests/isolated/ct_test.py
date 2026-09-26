import h, subprocess
from h import *
h.DB='ct'; PM='/dev-server/supabase/pending-migrations/'
subprocess.run('psql -h /tmp/iso -p 55432 -U postgres -qc "DROP DATABASE IF EXISTS ct" -c "CREATE DATABASE ct TEMPLATE base"',shell=True,check=True)
ok('fixtures', open('fixtures.sql').read())
T="'aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'"; A='11111111-1111-1111-1111-111111111111'; M='22222222-2222-2222-2222-222222222222'; S='33333333-3333-3333-3333-333333333333'; SUP='55555555-5555-5555-5555-555555555555'; B='44444444-4444-4444-4444-444444444444'
ok('match live: signed-out may run the four functions', 'GRANT EXECUTE ON FUNCTION public.allocate_contract_reference(uuid,text), public.employee_sensitive_fields(uuid), public.tenant_sensitive_fields(uuid), public.is_locked_contract_object(text) TO anon')
ok('existing counter at 41', f"INSERT INTO contract_reference_counters(tenant_id,year,last_number) VALUES({T},extract(year from now())::int,41)")
base_def=val("SELECT md5(pg_get_functiondef('public.allocate_contract_reference(uuid,text)'::regprocedure))")
al=lambda u: sql(f"SELECT allocate_contract_reference({T})",u)
rc,o,e=al('anon'); check('BEFORE fix: signed-out visitor can advance the counter (the gap)', rc==0 and o.endswith('0042'), o+e)
ok('install fix', open(PM+'20260926140000_signed_out_function_hardening.proposed.sql').read())
cnt=lambda: val("SELECT last_number FROM contract_reference_counters")
for n,u in [('signed out','anon'),('staff',S),('supervisor',SUP),('other-workspace admin',B)]:
    b=cnt(); rc,o,e=al(u); check(f'{n} refused, counter unchanged', rc!=0 and cnt()==b, o+e)
rc,o,e=al(M); check('manager gets next number (0043)', rc==0 and o.endswith('-0043'), o+e)
rc,o,e=al(A); check('admin gets next number (0044)', rc==0 and o.endswith('-0044'), o+e)
rc,o,e=al('service'); check('server functions get next number (0045)', rc==0 and o.endswith('-0045'), o+e)
for f in ['employee_sensitive_fields(uuid)','tenant_sensitive_fields(uuid)','is_locked_contract_object(text)']:
    check(f'signed-out cannot run {f}', val(f"SELECT has_function_privilege('anon','public.{f}','EXECUTE')")=='f')
ok('undo', open(PM+'rollback/20260926140000_signed_out_function_hardening.down.sql').read())
check('undo restores original function exactly', val("SELECT md5(pg_get_functiondef('public.allocate_contract_reference(uuid,text)'::regprocedure))")==base_def)
check('undo keeps the counter (45)', cnt()=='45')
print('CONTRACT', R)
