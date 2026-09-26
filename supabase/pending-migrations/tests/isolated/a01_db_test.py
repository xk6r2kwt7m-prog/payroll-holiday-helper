"""A01 — does the database itself enforce what the permission screens hide?
Runs only against the private rebuilt test database with fictional users.
Checks marked FINDING record current behaviour that is wider than the
permission settings; they are reported, not changed."""
import subprocess, sys
sys.path.insert(0, '/tmp/iso'); import h
h.DB = 'a01'
subprocess.run('psql -h /tmp/iso -p 55432 -U postgres -qc "DROP DATABASE IF EXISTS a01" -c "CREATE DATABASE a01 TEMPLATE base"', shell=True, check=True)
subprocess.run(['psql','-h','/tmp/iso','-p','55432','-U','postgres','-d','a01','-q','-v','ON_ERROR_STOP=1','-f','/tmp/iso/t/fixtures.sql'], check=True, capture_output=True)
A='aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'; B='bbbbbbbb-bbbb-bbbb-bbbb-00000000000b'
ADM='11111111-1111-1111-1111-111111111111'; MGR='22222222-2222-2222-2222-222222222222'
STF='33333333-3333-3333-3333-333333333333'; ADMB='44444444-4444-4444-4444-444444444444'
SUP='55555555-5555-5555-5555-555555555555'; X='66666666-6666-6666-6666-666666666666'
setup=f"""
INSERT INTO auth.users(id,email) VALUES ('{X}','two-workspaces@example.test');
INSERT INTO tenant_members(tenant_id,user_id,role,is_active) VALUES ('{A}','{X}','manager',true),('{B}','{X}','employee',true);
INSERT INTO user_roles(user_id,role,tenant_id) VALUES ('{ADM}','admin','{A}'),('{MGR}','manager','{A}'),('{STF}','staff','{A}'),('{SUP}','supervisor','{A}'),('{X}','manager','{A}');
UPDATE employees SET user_id='{STF}' WHERE id='e1000000-0000-0000-0000-000000000001';
INSERT INTO employees(id,tenant_id,forename,surname,department,status) VALUES ('eb000000-0000-0000-0000-00000000000b','{B}','Testc','Bee','FOH','active');
INSERT INTO time_entries(id,employee_id,tenant_id,branch,department,clock_in_time,clock_out_time,status) VALUES
 ('7e000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','{A}','Carnaby','FOH',now()-interval '9 hours',now()-interval '1 hour','pending'),
 ('7e000000-0000-0000-0000-000000000002','e2000000-0000-0000-0000-000000000002','{A}','Carnaby','BOH',now()-interval '9 hours',now()-interval '1 hour','pending'),
 ('7e000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000001','{A}','Carnaby','FOH',now()-interval '1 hour',null,'clocked_in'),
 ('7e000000-0000-0000-0000-00000000000b','eb000000-0000-0000-0000-00000000000b','{B}','Other','FOH',now()-interval '9 hours',now()-interval '1 hour','pending');
INSERT INTO role_permissions(tenant_id,role,permission_key,granted) VALUES ('{A}','manager','approve_timesheets',false);
"""
rc,o,e=h.sql(setup); assert rc==0, e
FINDINGS=[]
def approve(uid, entry):
    return h.sql(f"WITH u AS (UPDATE time_entries SET status='approved' WHERE id='{entry}' RETURNING 1) SELECT count(*) FROM u", uid)

# 1. Stored switch-off is NOT enforced by the database
rc,o,e=approve(MGR,'7e000000-0000-0000-0000-000000000002')
h.check('FINDING recorded: manager with approve_timesheets switched off can still approve directly', rc==0 and o=='1', f'{rc} {o} {e}')
if o=='1': FINDINGS.append('Database lets a manager approve timesheets even when that permission is switched off.')
rc,o,e=h.sql("SELECT count(*) FROM pg_policies WHERE qual ILIKE '%role_permissions%' OR with_check ILIKE '%role_permissions%'")
h.check('FINDING recorded: no database rule reads the permission settings', o=='0', o)

# 2. What the database does enforce
for who,uid in (('staff',STF),('supervisor',SUP),('other-workspace admin',ADMB),('signed-out','anon')):
    rc,o,e=approve(uid,'7e000000-0000-0000-0000-000000000001')
    h.check(f'{who} cannot approve a timesheet', rc!=0 or o=='0', f'{rc} {o} {e}')
rc,o,e=h.sql("WITH u AS (UPDATE time_entries SET status='approved' WHERE id='7e000000-0000-0000-0000-000000000003' RETURNING 1) SELECT count(*) FROM u", STF)
h.check('staff cannot approve their own open clock-in', rc!=0 or o=='0', f'{rc} {o} {e}')
h.check('staff sees only their own entries', h.val("SELECT count(*) FROM time_entries", STF)=='2')
h.check('manager cannot approve another workspace', approve(MGR,'7e000000-0000-0000-0000-00000000000b')[1] in ('0',''))
h.check('nothing in workspace B changed', h.val("SELECT status FROM time_entries WHERE id='7e000000-0000-0000-0000-00000000000b'")=='pending')

# 3. Permission settings and roles are protected
h.refused('manager cannot switch a permission back on', f"INSERT INTO role_permissions(tenant_id,role,permission_key,granted) VALUES ('{A}','manager','view_pay_data',true)", MGR)
rc,o,e=h.sql(f"WITH u AS (UPDATE role_permissions SET granted=true WHERE tenant_id='{A}' RETURNING 1) SELECT count(*) FROM u", MGR)
h.check('manager cannot change existing permission settings', rc!=0 or o=='0', f'{rc} {o}')
h.refused('manager cannot give themselves admin', f"INSERT INTO user_roles(user_id,role,tenant_id) VALUES ('{MGR}','admin','{A}')", MGR)
h.refused('staff cannot give themselves manager', f"INSERT INTO user_roles(user_id,role,tenant_id) VALUES ('{STF}','manager','{A}')", STF)
h.check('other-workspace admin cannot read A permission settings', h.val("SELECT count(*) FROM role_permissions", ADMB)=='0')
h.check('staff can read their own workspace settings (read-only)', h.val("SELECT count(*) FROM role_permissions", STF)=='1')

# 4. Two-workspace user: roles are stored per workspace, but the app reads them unscoped
h.check('two-workspace user: database treats them as employee in B', approve(X,'7e000000-0000-0000-0000-00000000000b')[1] in ('0',''))
h.check('two-workspace user: role rows visible to them (all workspaces)', h.val("SELECT string_agg(role::text||'@'||(tenant_id='"+A+"')::text, ',') FROM user_roles", X)=='manager@true')
FINDINGS.append('App reads a person\'s role without checking the current workspace; in a second workspace the screens can show manager controls the database then refuses.')
h.sql(f"UPDATE tenant_members SET is_active=false WHERE user_id='{X}' AND tenant_id='{A}'")
h.check('deactivated manager membership: database refuses approval', approve(X,'7e000000-0000-0000-0000-000000000002')[1] in ('0',''))
h.check('deactivated manager membership: role row still says manager', h.val(f"SELECT role FROM user_roles WHERE user_id='{X}'")=='manager')
FINDINGS.append('Deactivating a membership leaves the role row; the app would still show that role until it is removed.')

print('A01_DB', h.R); print('FINDINGS'); [print('-',f) for f in FINDINGS]
