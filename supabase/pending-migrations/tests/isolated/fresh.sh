#!/bin/bash
# fresh.sh DBNAME  -> creates db, boots, applies history
DB=$1; P="psql -h /tmp/iso -p 55432 -U postgres -v ON_ERROR_STOP=1 -q"
psql -h /tmp/iso -p 55432 -U postgres -qc "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
psql -h /tmp/iso -p 55432 -U postgres -qc "ALTER DATABASE $DB SET search_path = public, extensions"; $P -d $DB -f /tmp/iso/boot.sql >/dev/null 2>/tmp/iso/boot.err || { cat /tmp/iso/boot.err; exit 1; }
python3 /tmp/iso/order.py > /tmp/iso/order.txt
while read f; do
  case "$f" in *0032_*) continue;; esac
  case "$f" in *20260311093402*) $P -d $DB -f /tmp/iso/preclean.sql >/dev/null 2>&1;; esac
  $P -d $DB -f "$f" >/dev/null 2>/tmp/iso/last.err || { echo "FAIL $f"; head -5 /tmp/iso/last.err; exit 1; }
done < /tmp/iso/order.txt
echo HISTORY_OK
