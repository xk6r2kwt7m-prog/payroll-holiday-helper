// PR #16 clock-in-out handler run against the private rebuilt PostgreSQL test database.
// Fictional staff only. Service-role behaviour = superuser connection (bypasses RLS, like the service key).
import postgres from '/dev-server/node_modules/postgres/src/index.js';
import ts from '/dev-server/node_modules/typescript/lib/typescript.js';
import { readFileSync } from 'node:fs';

const SRC = process.argv[2] || '/tmp/pr16/index.ts';
const sql = postgres({ host: '/tmp/iso', port: 55432, user: 'postgres', database: 'a02', max: 4, onnotice: () => {} });
const A = 'aaaaaaaa-aaaa-aaaa-aaaa-00000000000a', B = 'bbbbbbbb-bbbb-bbbb-bbbb-00000000000b';
const E1 = 'e1000000-0000-0000-0000-000000000001', E2 = 'e2000000-0000-0000-0000-000000000002', EB = 'eb000000-0000-0000-0000-00000000000b';
const U1 = '33333333-3333-3333-3333-333333333333', UX = '77777777-7777-7777-7777-777777777777', UB = '88888888-8888-8888-8888-888888888888';
let failTable = null;
const R = { pass: 0, fail: 0 }, fails = [];
const check = (name, ok, info = '') => { ok ? R.pass++ : (R.fail++, fails.push(name + ' ' + info)); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' :: ' + info)); };

function client() {
  return { from(table) {
    const f = []; let cols = '*', lim, mut, wantRows = false;
    const where = () => f.length ? sql`where ${f.map(([c, v], i) => sql`${i ? sql`and` : sql``} ${v?.inDates ? sql`${sql(c)} = ANY(${v.inDates}::date[])` : sql`${sql(c)} = ${v}`}`)}` : sql``;
    const run = async () => {
      if (failTable === table) return { data: null, error: { message: 'db offline' } };
      try {
        let rows;
        if (mut?.k === 'insert') rows = await sql`insert into ${sql(table)} ${sql(mut.v)} returning *`;
        else if (mut?.k === 'update') rows = await sql`update ${sql(table)} set ${sql(mut.v)} ${where()} returning *`;
        else rows = await sql`select ${cols === '*' ? sql`*` : sql(cols.split(',').map(s => s.trim()))} from ${sql(table)} ${where()} ${lim ? sql`limit ${lim}` : sql``}`;
        return { data: [...rows].map(r => JSON.parse(JSON.stringify(r))), error: null };
      } catch (e) { return { data: null, error: { code: e.code, message: e.message } }; }
    };
    const q = {
      select: (c) => { if (mut) wantRows = true; else if (c) cols = c; return q; },
      eq: (c, v) => { f.push([c, v]); return q; },
      in: (c, dates) => { f.push([c, { inDates: dates }]); return q; },
      limit: async (n) => { lim = n; return run(); },
      maybeSingle: async () => { const r = await run(); return r.error ? r : r.data.length > 1 ? { data: null, error: { code: 'PGRST116' } } : { data: r.data[0] ?? null, error: null }; },
      single: async () => { const r = await run(); return r.error ? r : r.data.length === 1 ? { data: r.data[0], error: null } : { data: null, error: { code: 'PGRST116' } }; },
      insert: (v) => { mut = { k: 'insert', v }; return q; },
      update: (v) => { mut = { k: 'update', v }; return q; },
      then: (res, rej) => run().then(res, rej),
    };
    return q;
  } };
}

function load(nowIso, userId) {
  let handler;
  const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { a.length ? super(...a) : super(nowIso); } static now() { return new RealDate(nowIso).getTime(); } }
  const src = readFileSync(SRC, 'utf8').replace(/^import .*;\s*/m, '');
  const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const createClient = (_u, _k, o) => o ? { auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) } } : client();
  new Function('createClient', 'Deno', 'Date', js)(createClient, { env: { get: () => 'x' }, serve: (cb) => { handler = cb; } }, FakeDate);
  return async (body) => { const r = await handler(new Request('https://t/clock', { method: 'POST', headers: { Authorization: 'Bearer t' }, body: JSON.stringify(body) })); return { s: r.status, b: await r.json() }; };
}
const entries = (emp = E1) => sql`select * from time_entries where employee_id = ${emp} order by clock_in_time`;
const reset = async () => { failTable = null; await sql`delete from time_entries`; await sql`delete from shifts`; };

// Fixtures (fictional)
await sql`update employees set user_id = ${U1} where id = ${E1}`;
await sql`insert into auth.users(id,email) values (${UX},'no-membership@example.test'),(${UB},'b@example.test') on conflict do nothing`;
await sql`update employees set user_id = ${UX} where id = ${E2}`; // linked, deliberately NO tenant_members row
await sql`insert into employees(id,tenant_id,forename,surname,department,status,hourly_rate,user_id) values (${EB},${B},'Testc','Bee','FOH','active',12.21,${UB})`;
await sql`insert into branch_locations(tenant_id,branch,display_name,latitude,longitude,geofence_radius_meters) values
 (${A},'Carnaby','Carnaby',51.5130,-0.1390,150),(${A},'Brixton','Brixton',51.4620,-0.1140,150),(${B},'Other','Other',51.60,-0.20,150)`;

const D = '2026-09-20';
async function shift(emp, tenant, branch, date, st, en, status = 'scheduled') {
  const [r] = await sql`insert into shifts(employee_id,tenant_id,branch,department,shift_date,start_time,end_time,status) values (${emp},${tenant},${branch},'FOH',${date},${st},${en},${status}) returning id`; return r.id;
}

// ---- 1. ownership and branch checks against real rows
await reset();
{ const s = await shift(E1, B, 'Carnaby', D, '09:00', '17:00'); const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby', shift_id: s });
  check('shift from another workspace refused', r.s === 400 && (await entries()).length === 0, JSON.stringify(r)); }
await reset();
{ const s = await shift(E2, A, 'Carnaby', D, '09:00', '17:00'); const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby', shift_id: s });
  check("another employee's shift refused", r.s === 400 && (await entries()).length === 0, JSON.stringify(r)); }
await reset();
{ const s = await shift(E1, A, 'Brixton', D, '09:00', '17:00'); const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby', shift_id: s });
  check('own shift at a different branch refused', r.s === 400, JSON.stringify(r)); }
await reset();
{ const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Other' });
  check("branch from another workspace refused", r.s === 400 && (await entries()).length === 0, JSON.stringify(r)); }
{ const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: B, branch: 'Other' });
  check('workspace selector not belonging to caller -> no record, nothing written', r.s === 404 && (await sql`select 1 from time_entries`).length === 0, JSON.stringify(r)); }
{ const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Brixton', latitude: 51.5130, longitude: -0.1390 });
  check('GPS at Carnaby while claiming Brixton refused', r.s === 403 && (await entries()).length === 0, JSON.stringify(r)); }
await reset();
{ const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby', latitude: 0, longitude: 0 });
  check('valid zero coordinates outside geofence are refused', r.s === 403 && (await entries()).length === 0, JSON.stringify(r)); }
{ const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby', latitude: 91, longitude: 0 });
  check('invalid coordinates are refused', r.s === 400 && (await entries()).length === 0, JSON.stringify(r)); }
await reset();
{ const i = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  const o = await load(`${D}T17:00:00Z`, U1)({ action: 'clock_out', tenant_id: A, latitude: 0, longitude: 0 });
  const [e] = await entries();
  check('GPS unavailable clock-in and outside-area clock-out complete with review flags', i.s === 200 && i.b.requires_review === true &&
    o.s === 200 && o.b.requires_review === true && e.clock_in_within_geofence === false && e.clock_out_within_geofence === false &&
    e.clock_in_latitude === null && Number(e.clock_out_latitude) === 0, JSON.stringify([i, o])); }

// ---- 2. normal day, validated shift, clock-out, hours trigger
await reset();
{ const s = await shift(E1, A, 'Carnaby', D, '09:00', '17:00');
  const i = await load(`${D}T08:55:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby', shift_id: s, latitude: 51.5130, longitude: -0.1390 });
  const o = await load(`${D}T17:05:00Z`, U1)({ action: 'clock_out', tenant_id: A, break_minutes: 30 });
  const [e] = await entries();
  check('day shift: clock-in linked to validated shift', i.s === 200 && e.shift_id === s && e.tenant_id === A, JSON.stringify(i));
  check('day shift: clock-out saved, status pending, hours by trigger', o.s === 200 && e.status === 'pending' && Number(e.total_hours ?? e.hours_worked ?? 0) > 0, JSON.stringify(e)); }

// ---- 3. retries / duplicates / concurrency (real unique index)
await reset();
{ const h = load(`${D}T09:00:00Z`, U1); await h({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  const r = await h({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  check('retry while clocked in refused, one open entry', r.s === 409 && (await entries()).length === 1, JSON.stringify(r)); }
await reset();
{ const h = load(`${D}T09:00:00Z`, U1); const rs = await Promise.all([1, 2, 3, 4].map(() => h({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' })));
  check('4 concurrent clock-ins -> exactly one saved, rest 409', (await entries()).length === 1 && rs.filter(r => r.s === 200).length === 1 && rs.filter(r => r.s === 409).length === 3, JSON.stringify(rs.map(r => r.s))); }
{ const h = load(`${D}T17:00:00Z`, U1); const rs = await Promise.all([1, 2].map(() => h({ action: 'clock_out', tenant_id: A })));
  const e = await entries(); check('2 concurrent clock-outs -> one succeeds, entry closed once', rs.filter(r => r.s === 200).length === 1 && e.length === 1 && e[0].status === 'pending', JSON.stringify(rs.map(r => [r.s, r.b.error]))); }
await reset();
{ failTable = 'time_entries'; const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' }); failTable = null;
  check('open-entry read failure -> 503, nothing written', r.s === 503 && (await entries()).length === 0, JSON.stringify(r)); }
{ failTable = 'branch_locations'; const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' }); failTable = null;
  check('branch read failure -> 503', r.s === 503, JSON.stringify(r)); }
{ failTable = 'employees'; const r = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' }); failTable = null;
  check('employee read failure -> 503 (not "not linked")', r.s === 503 && !/No employee/.test(r.b.error), JSON.stringify(r)); }
{ failTable = 'time_entries'; const r = await load(`${D}T17:00:00Z`, U1)({ action: 'clock_out', tenant_id: A }); failTable = null;
  check('clock-out read failure -> 503, not "no clock-in"', r.s === 503, JSON.stringify(r)); }

// ---- 4. overnight shifts
await reset();
{ const s = await shift(E1, A, 'Carnaby', D, '22:00', '06:00');
  const i = await load(`${D}T21:55:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  const o = await load(`2026-09-21T06:05:00Z`, U1)({ action: 'clock_out', tenant_id: A, break_minutes: 0 });
  const [e] = await entries();
  check('overnight: before-midnight clock-in auto-links the shift', i.s === 200 && e.shift_id === s, JSON.stringify(e?.shift_id));
  check('overnight: clock-out next morning accepted', o.s === 200 && e.status === 'pending', JSON.stringify(o));
  console.log('INFO overnight stored hours:', JSON.stringify({ total_hours: e.total_hours, hours_worked: e.hours_worked, scheduled_start: e.scheduled_start, scheduled_end: e.scheduled_end })); }
await reset();
{ const s = await shift(E1, A, 'Carnaby', '2026-09-21', '00:00', '06:00');
  const i = await load(`${D}T23:50:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  const [e] = await entries();
  check('BST: local next-day shift links when UTC is still the previous day', i.s === 200 && e.shift_id === s, `saved shift_id=${e?.shift_id}`); }
await reset();
{ const s = await shift(E1, A, 'Carnaby', '2026-09-21', '00:30', '06:00'); // London 00:25 BST = 23:25 UTC previous day
  const i = await load(`${D}T23:25:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  const [e] = await entries();
  check('BST: 00:25 local near a 00:30 rota start links', i.s === 200 && e.shift_id === s, `saved shift_id=${e?.shift_id}`); }
await reset();
{ const s = await shift(E1, A, 'Carnaby', '2026-09-21', '00:00', '06:00'); // 23:50 BST = 22:50 UTC
  const i = await load(`${D}T22:50:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  const [e] = await entries();
  check('BST: 23:50 local early for next-day midnight shift links', i.s === 200 && e.shift_id === s, `saved shift_id=${e?.shift_id}`); }
await reset();
{ const s = await shift(E1, A, 'Carnaby', '2026-01-11', '00:00', '06:00');
  const i = await load('2026-01-10T23:50:00Z', U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  const [e] = await entries();
  check('GMT: 23:50 local early for next-day midnight shift links', i.s === 200 && e.shift_id === s, `saved shift_id=${e?.shift_id}`); }
await reset();
{ const s1 = await shift(E1, A, 'Carnaby', D, '21:30', '05:30');
  const s2 = await shift(E1, A, 'Carnaby', D, '22:00', '06:00');
  const i = await load(`${D}T20:55:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  const [e] = await entries();
  check('two plausible rota shifts do not auto-link either', i.s === 200 && e.shift_id === null && s1 !== s2, JSON.stringify(e?.shift_id)); }
await reset();
{ const s = await shift(E1, A, 'Carnaby', '2026-09-21', '00:00', '06:00');
  const i = await load(`${D}T23:50:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby', shift_id: s });
  const [e] = await entries(); check('overnight: explicit own shift_id links correctly across the date change', i.s === 200 && e.shift_id === s, JSON.stringify(i)); }

// ---- 5. existing access path: linked employee without tenant membership (preserved behaviour)
await reset();
{ const i = await load(`${D}T09:00:00Z`, UX)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  const o = await load(`${D}T17:00:00Z`, UX)({ action: 'clock_out', tenant_id: A });
  check('linked employee with no membership can still clock in/out (unchanged)', i.s === 200 && o.s === 200, JSON.stringify([i, o])); }
{ const i = await load(`${D}T09:00:00Z`, UX)({ action: 'clock_in', branch: 'Carnaby' });
  check('same employee without workspace selector (older app) still clocks in', i.s === 200, JSON.stringify(i));
  await load(`${D}T17:00:00Z`, UX)({ action: 'clock_out' }); }
await sql`update tenant_members set is_active=false where user_id=${U1}`;
await reset();
{ const i = await load(`${D}T10:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' });
  check('revoked membership cannot clock in', i.s === 403 && (await entries()).length === 0, JSON.stringify(i)); }
{ const [e] = await sql`insert into time_entries(employee_id,tenant_id,branch,department,clock_in_time,status) values (${E1},${A},'Carnaby','FOH',${D+'T09:00:00Z'},'clocked_in') returning id`;
  const o = await load(`${D}T17:00:00Z`, U1)({ action: 'clock_out', tenant_id: A });
  const [still] = await sql`select status from time_entries where id=${e.id}`;
  check('revoked membership cannot close an existing open clock-in', o.s === 403 && still.status === 'clocked_in', JSON.stringify(o)); }
await sql`update tenant_members set is_active=true where user_id=${U1}`;
await reset();
{ failTable = 'tenant_members'; const i = await load(`${D}T09:00:00Z`, U1)({ action: 'clock_in', tenant_id: A, branch: 'Carnaby' }); failTable = null;
  check('membership check outage refuses clock-in without writing', i.s === 503 && (await entries()).length === 0, JSON.stringify(i)); }
{ const bRows = await sql`select 1 from time_entries where tenant_id=${B}`; check('workspace B untouched throughout', bRows.length === 0); }

console.log('A02_ISO', JSON.stringify(R)); if (fails.length) console.log('FAILED:\n- ' + fails.join('\n- '));
await sql.end();
