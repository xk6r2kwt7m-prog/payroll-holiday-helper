#!/usr/bin/env bash
# Runs the payroll recovery database tests against a PRIVATE throwaway
# PostgreSQL copy of the schema. Never point this at the live database.
#   PGT="psql -h /tmp/pgt -p 55432 -U postgres" ./run.sh <fresh-db-name>
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DB="${1:?database name}"
P="${PGT:?set PGT to a psql command for the throwaway server} -d $DB -v ON_ERROR_STOP=1 -q"

$P -f "$DIR/atomic_payroll_recovery.test.sql" >/dev/null

# ---- concurrency: two sessions, same request id, first holds its transaction open
AS_A="SET ROLE authenticated; SELECT as_user('a0000000-0000-0000-0000-00000000000a');"
$P -c "$AS_A BEGIN; SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000008','99999999-0000-0000-0000-000000000008','c'); SELECT pg_sleep(2); COMMIT;" >/dev/null &
sleep 0.5
R2=$($P -At -c "$AS_A SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000008','99999999-0000-0000-0000-000000000008','c')->>'already_done';" | tail -1)
wait
$P -c "SELECT t('concurrent retry with same request id waits, then returns the first result', '$R2' = 'true');" >/dev/null

# ---- double-click: two different request ids at once, only one deletion happens
$P -c "SELECT t_seed('50000000-0000-0000-0000-000000000009', 9, 'draft', '2026-08-17');" >/dev/null
$P -c "$AS_A BEGIN; SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000009', gen_random_uuid(), NULL); SELECT pg_sleep(2); COMMIT;" >/dev/null &
sleep 0.5
R3=$($P -At -c "$AS_A SELECT t_err('double-click second request refused', \$\$SELECT delete_draft_payroll_period('50000000-0000-0000-0000-000000000009', gen_random_uuid(), NULL)\$\$, 'not found'); SELECT 1;" | tail -1)
wait
$P -c "SELECT t('double-click leaves exactly one recovery', (SELECT count(*) FROM payroll_period_recoveries WHERE period_id = '50000000-0000-0000-0000-000000000009') = 1);" >/dev/null

# ---- double restore at once: one restores, the other returns already_done
RID=$($P -At -c "SELECT id FROM payroll_period_recoveries WHERE period_id = '50000000-0000-0000-0000-000000000009'")
$P -c "$AS_A BEGIN; SELECT restore_draft_payroll_period('$RID'); SELECT pg_sleep(2); COMMIT;" >/dev/null &
sleep 0.5
R4=$($P -At -c "$AS_A SELECT restore_draft_payroll_period('$RID')->>'already_done';" | tail -1)
wait
$P -c "SELECT t('concurrent double restore: second waits and returns already done', '$R4' = 'true');
       SELECT t('double restore created one period and one set of entries',
         (SELECT count(*) FROM payroll_periods WHERE id = '50000000-0000-0000-0000-000000000009') = 1
         AND (SELECT count(*) FROM payroll_entries WHERE payroll_period_id = '50000000-0000-0000-0000-000000000009') = 2);" >/dev/null

$P -At -F ' | ' -c "SELECT n, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, name, CASE WHEN ok THEN '' ELSE coalesce(detail,'') END FROM t_results ORDER BY n"
$P -At -c "SELECT format('%s passed, %s failed', count(*) FILTER (WHERE ok), count(*) FILTER (WHERE NOT ok)) FROM t_results"
