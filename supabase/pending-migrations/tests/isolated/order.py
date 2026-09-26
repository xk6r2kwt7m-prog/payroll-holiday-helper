import json,glob,os
for f in sorted(glob.glob('/dev-server/supabase/migrations/*.sql')): print(f)
j=json.load(open('/dev-server/drizzle/migrations/meta/_journal.json'))
for e in j['entries']: print('/dev-server/drizzle/migrations/%s.sql'%e['tag'])
