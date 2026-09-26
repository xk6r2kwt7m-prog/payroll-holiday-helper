"""Run ONLY on the private rebuilt database with fictional users and entries.
Prerequisite: /tmp/iso/base and /tmp/iso/t/fixtures.sql from the existing harness.
"""
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, '/tmp/iso')
import h

h.DB = 'a04'
subprocess.run('psql -h /tmp/iso -p 55432 -U postgres -qc "DROP DATABASE IF EXISTS a04" -c "CREATE DATABASE a04 TEMPLATE base"', shell=True, check=True)
def run_file(path):
    subprocess.run(['psql', '-h', '/tmp/iso', '-p', '55432', '-U', 'postgres', '-d', 'a04',
                    '-q', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], check=True, capture_output=True)

here = Path(__file__).resolve().parents[2]
run_file(Path('/tmp/iso/t/fixtures.sql'))
run_file(here / '20260926160000_manager_timesheet_write_guard.proposed.sql')

A = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'
MGR = '22222222-2222-2222-2222-222222222222'
ADM = '11111111-1111-1111-1111-111111111111'
STF = '33333333-3333-3333-3333-333333333333'
E = '7e000000-0000-0000-0000-000000000001'
EMP = 'e1000000-0000-0000-0000-000000000001'

setup = f"""
UPDATE employees SET user_id='{STF}' WHERE id='{EMP}';
INSERT INTO time_entries(id,employee_id,tenant_id,branch,department,clock_in_time,clock_out_time,status)
VALUES ('{E}','{EMP}','{A}','Carnaby','FOH',now()-interval '9 hours',now()-interval '1 hour','pending');
INSERT INTO role_permissions(tenant_id,role,permission_key,granted)
VALUES ('{A}','manager','approve_timesheets',false);
"""
rc, out, err = h.sql(setup)
assert rc == 0, err

def approve(uid):
    return h.sql(f"WITH u AS (UPDATE time_entries SET status='approved' WHERE id='{E}' RETURNING 1) SELECT count(*) FROM u", uid)

h.refused('manager with permission off cannot approve via direct SQL',
          f"UPDATE time_entries SET status='approved' WHERE id='{E}'", MGR)
h.check('refused approval kept entry pending', h.val(f"SELECT status FROM time_entries WHERE id='{E}'") == 'pending')
h.refused('manager with permission off cannot delete a timesheet',
          f"DELETE FROM time_entries WHERE id='{E}'", MGR)
h.refused('manager with permission off cannot add a timesheet',
          f"INSERT INTO time_entries(employee_id,tenant_id,branch,department,clock_in_time,status) VALUES ('{EMP}','{A}','Carnaby','FOH',now(),'pending')", MGR)
h.check('refused writes kept one timesheet', h.val("SELECT count(*) FROM time_entries") == '1')

rc, _, err = h.sql(f"UPDATE time_entries SET status='approved' WHERE id='{E}'", ADM)
h.check('company admin retains authority', rc == 0, err)
h.sql(f"UPDATE time_entries SET status='pending' WHERE id='{E}'")
h.sql(f"UPDATE role_permissions SET granted=true WHERE tenant_id='{A}' AND role='manager' AND permission_key='approve_timesheets'")
rc, out, err = approve(MGR)
h.check('manager with permission on can approve', rc == 0 and out == '1', f'{rc} {out} {err}')
h.sql(f"UPDATE time_entries SET status='pending' WHERE id='{E}'")
h.sql(f"DELETE FROM role_permissions WHERE tenant_id='{A}' AND role='manager' AND permission_key='approve_timesheets'")
rc, out, err = approve(MGR)
h.check('manager without override retains default approval', rc == 0 and out == '1', f'{rc} {out} {err}')

# Undo restores the old behaviour; never run this on production as a test.
h.sql(f"UPDATE time_entries SET status='pending' WHERE id='{E}'")
h.sql(f"INSERT INTO role_permissions(tenant_id,role,permission_key,granted) VALUES ('{A}','manager','approve_timesheets',false)")
run_file(here / 'rollback/20260926160000_manager_timesheet_write_guard.down.sql')
rc, out, err = approve(MGR)
h.check('rollback removes only the guard and restores old manager write path', rc == 0 and out == '1', f'{rc} {out} {err}')

print('A04 private-db results:', h.R)
