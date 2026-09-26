"""Run only on /tmp/iso's throwaway rebuilt Postgres database with fictional users.

Prerequisite: existing /tmp/iso/base and /tmp/iso/t/fixtures.sql harness.
Never point this script at production; it drops and creates a private test DB.
"""
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, '/tmp/iso')
import h

h.DB = 'a06'
subprocess.run(['psql', '-h', '/tmp/iso', '-p', '55432', '-U', 'postgres', '-qc',
                'DROP DATABASE IF EXISTS a06', '-c', 'CREATE DATABASE a06 TEMPLATE base'], check=True)

def run_file(path):
    subprocess.run(['psql', '-h', '/tmp/iso', '-p', '55432', '-U', 'postgres', '-d', h.DB,
                    '-q', '-v', 'ON_ERROR_STOP=1', '-f', str(path)], check=True, capture_output=True)

here = Path(__file__).resolve().parents[2]
run_file(Path('/tmp/iso/t/fixtures.sql'))
run_file(here / '20260926160000_manager_timesheet_write_guard.proposed.sql')
run_file(here / '20260926170000_atomic_timesheet_history.proposed.sql')
h.check('client readiness function is enabled in private database',
        h.val('SELECT public.timesheet_history_ready()::text') == 'true')

A = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'
MGR = '22222222-2222-2222-2222-222222222222'
ADM = '11111111-1111-1111-1111-111111111111'
EMP = 'e1000000-0000-0000-0000-000000000001'
E = '7e000000-0000-0000-0000-000000000001'
S = '7e000000-0000-0000-0000-000000000002'

def count(entry):
    return int(h.val(f"SELECT count(*) FROM audit_log WHERE table_name='time_entries' AND record_id='{entry}'"))

h.ok('manager insert succeeds without direct audit permission',
     f"INSERT INTO time_entries(id,employee_id,tenant_id,branch,department,clock_in_time,status) "
     f"VALUES ('{E}','{EMP}','{A}','Carnaby','FOH',now()-interval '9 hours','clocked_in')", MGR)
h.check('insert has exactly one transactional history row', count(E) == 1)
h.check('creator is the manager, rather than an invented system identity',
        h.val(f"SELECT user_id FROM audit_log WHERE record_id='{E}'") == MGR)
h.check('manager cannot insert directly into admin-only audit_log',
        h.sql(f"INSERT INTO audit_log (tenant_id,action,table_name,record_id) VALUES ('{A}','update','time_entries','{E}')", MGR)[0] != 0)

h.ok('manager can close the shift with a documented adjustment',
     f"UPDATE time_entries SET clock_out_time=now()-interval '1 hour', "
     f"manager_adjusted=true, adjusted_by='{MGR}', adjustment_reason='Corrected an overnight shift' WHERE id='{E}'", MGR)
h.check('edit has exactly one extra history row and its reason', count(E) == 2 and
        h.val(f"SELECT new_data->>'adjustment_reason' FROM audit_log WHERE record_id='{E}' ORDER BY created_at DESC,id DESC LIMIT 1")
        == 'Corrected an overnight shift')
h.check('old and new clock-out values are retained',
        h.val(f"SELECT count(*) FROM audit_log WHERE record_id='{E}' AND action='update' "
              "AND old_data->>'clock_out_time' IS NULL AND new_data->>'clock_out_time' IS NOT NULL") == '1')

h.ok('manager approval includes the written review and mode',
     f"UPDATE time_entries SET status='approved', approved_by='{MGR}', approved_at=now(), "
     "approval_mode='approve_single', approval_review_reason='Checked with the duty manager' "
     f"WHERE id='{E}'", MGR)
h.check('approval has exactly one history row and keeps manager reason', count(E) == 3 and
        h.val(f"SELECT action::text || ':' || (new_data->>'approval_review_reason') FROM audit_log "
              f"WHERE record_id='{E}' ORDER BY created_at DESC,id DESC LIMIT 1")
        == 'approve:Checked with the duty manager')
h.check('approval mode kept in the history snapshot',
        h.val(f"SELECT new_data->>'approval_mode' FROM audit_log WHERE record_id='{E}' AND action='approve'") == 'approve_single')

h.ok('no business change creates no extra history',
     f"UPDATE time_entries SET updated_at=now() WHERE id='{E}'", ADM)
h.check('updated_at-only write does not duplicate history', count(E) == 3)

h.ok('service role creates a clock-in without impersonating a manager',
     f"INSERT INTO time_entries(id,employee_id,tenant_id,branch,department,clock_in_time,status,"
     "clock_in_latitude,clock_in_longitude) "
     f"VALUES ('{S}','{EMP}','{A}','Carnaby','FOH',now(),'clocked_in',51.5,-0.1)", 'service')
h.check('service record has null human user and a server source',
        h.val(f"SELECT coalesce(user_id::text,'none') || ':' || (new_data->>'actor_source') FROM audit_log WHERE record_id='{S}'")
        == 'none:server')
h.check('audit omits exact coordinates but records that a location existed',
        h.val(f"SELECT (new_data ? 'clock_in_latitude')::text || ':' || (new_data->>'clock_in_location_recorded') "
              f"FROM audit_log WHERE record_id='{S}'") == 'false:true')
h.ok('service clock-out still succeeds',
     f"UPDATE time_entries SET clock_out_time=now()+interval '1 hour',clock_out_within_geofence=false WHERE id='{S}'", 'service')
h.check('service clock-out produces a second history row', count(S) == 2)
h.ok('changed coordinates are tracked without storing the raw point in history',
     f"UPDATE time_entries SET clock_out_latitude=51.6,clock_out_longitude=-0.2 WHERE id='{S}'", 'service')
h.check('coordinate-only edit produces a redacted history event', count(S) == 3 and
        h.val(f"SELECT (new_data->>'coordinates_changed') || ':' || (new_data ? 'clock_out_latitude')::text "
              f"FROM audit_log WHERE record_id='{S}' ORDER BY created_at DESC,id DESC LIMIT 1") == 'true:false')

# A failed audit insert must abort the associated timesheet mutation.
h.ok('install a forced-audit-failure trigger on the private copy', """
CREATE FUNCTION public.fail_time_entry_audit_test() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN IF NEW.table_name = 'time_entries' THEN
  RAISE EXCEPTION 'synthetic audit outage'; END IF; RETURN NEW; END $$;
CREATE TRIGGER fail_time_entry_audit_test BEFORE INSERT ON audit_log
FOR EACH ROW EXECUTE FUNCTION public.fail_time_entry_audit_test();
""")
before = count(E)
h.refused('forced audit outage rolls back manager edit',
          f"UPDATE time_entries SET break_minutes=45 WHERE id='{E}'", MGR,
          must='synthetic audit outage')
h.check('failed edit changed neither timesheet nor history',
        h.val(f"SELECT break_minutes FROM time_entries WHERE id='{E}'") != '45' and count(E) == before)
h.ok('remove synthetic failure', """
DROP TRIGGER fail_time_entry_audit_test ON audit_log;
DROP FUNCTION public.fail_time_entry_audit_test();
""")

h.ok('set manager permission off in the private copy',
     f"INSERT INTO role_permissions(tenant_id,role,permission_key,granted) VALUES ('{A}','manager','approve_timesheets',false)")
before = count(E)
h.refused('permission guard refuses manager edit', f"UPDATE time_entries SET break_minutes=45 WHERE id='{E}'", MGR)
h.check('refused edit creates no false history', count(E) == before)
h.ok('undo permission switch for remaining test',
     f"DELETE FROM role_permissions WHERE tenant_id='{A}' AND role='manager' AND permission_key='approve_timesheets'")

run_file(here / 'rollback/20260926170000_atomic_timesheet_history.down.sql')
h.check('rollback preserved all recorded history and manager reason',
        count(E) == 3 and h.val(f"SELECT approval_review_reason FROM time_entries WHERE id='{E}'")
        == 'Checked with the duty manager')
h.ok('old update path still works after rollback',
     f"UPDATE time_entries SET break_minutes=30 WHERE id='{E}'", MGR)
h.check('rollback stopped new trigger history', count(E) == 3)

print('A06 private-db results:', h.R)
if h.R['fail']:
    raise SystemExit(1)
