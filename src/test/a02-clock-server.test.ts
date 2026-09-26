import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

type Row = Record<string, any>;
const employee = { id: 'employee-a', user_id: 'user-a', tenant_id: 'tenant-a', status: 'active', department: 'FOH' };
const branch = { tenant_id: 'tenant-a', branch: 'Carnaby', latitude: 51.5, longitude: -0.1, geofence_radius_meters: 100 };
function server(fixture: {
  rows?: Record<string, Row[]>;
  fail?: string;
  userId?: string;
} = {}) {
  const rows: Record<string, Row[]> = {
    employees: [employee], branch_locations: [branch], shifts: [], time_entries: [],
    ...fixture.rows,
  };
  let handler: (req: Request) => Promise<Response>;
  const dataClient = {
    from(table: string) {
      const filters: [string, any][] = [];
      let mutation: { kind: 'update' | 'insert'; value: Row } | undefined;
      let max: number | undefined;
      const result = () => {
        if (fixture.fail === table) return { data: null, error: { message: 'db offline' } };
        const matching = (rows[table] || []).filter(r => filters.every(([col, val]) => r[col] === val));
        if (mutation?.kind === 'insert') {
          const added = { ...mutation.value, id: 'new-entry' };
          rows[table].push(added);
          return { data: [added], error: null };
        }
        if (mutation?.kind === 'update') {
          matching.forEach(row => Object.assign(row, mutation!.value));
          return { data: matching, error: null };
        }
        return { data: matching.slice(0, max), error: null };
      };
      const q: any = {
        select: () => q, eq: (col: string, val: any) => { filters.push([col, val]); return q; },
        limit: async (n: number) => { max = n; return result(); },
        maybeSingle: async () => {
          const r = result();
          return r.error ? r : r.data!.length > 1 ? { data: null, error: { code: 'PGRST116' } } : { data: r.data![0] ?? null, error: null };
        },
        single: async () => {
          const r = result();
          return r.error ? r : r.data!.length === 1 ? { data: r.data![0], error: null } : { data: null, error: { code: 'PGRST116' } };
        },
        insert: (value: Row) => { mutation = { kind: 'insert', value }; return q; },
        update: (value: Row) => { mutation = { kind: 'update', value }; return q; },
        then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => Promise.resolve(result()).then(resolve, reject),
      };
      return q;
    },
  };
  const source = readFileSync('supabase/functions/clock-in-out/index.ts', 'utf8')
    .replace(/^import .*;\s*/m, '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const createClient = (_url: string, _key: string, options?: unknown) =>
    options ? { auth: { getUser: async () => ({ data: { user: { id: fixture.userId || 'user-a' } }, error: null }) } } : dataClient;
  const Deno = { env: { get: () => 'mock' }, serve: (cb: typeof handler) => { handler = cb; } };
  new Function('createClient', 'Deno', compiled)(createClient, Deno);
  return {
    rows,
    async request(body: Row) {
      const res = await handler(new Request('https://example.test/clock-in-out', {
        method: 'POST', headers: { Authorization: 'Bearer synthetic' }, body: JSON.stringify(body),
      }));
      return { status: res.status, body: await res.json() as Row };
    },
  };
}

describe('A02 clock server with synthetic rows', () => {
  it('refuses an employee-linked request for a shift belonging to another workspace', async () => {
    const s = server({ rows: { shifts: [{ id: 'foreign', employee_id: 'employee-a', tenant_id: 'tenant-b', branch: 'Carnaby', status: 'scheduled' }] } });
    const r = await s.request({ action: 'clock_in', tenant_id: 'tenant-a', branch: 'Carnaby', shift_id: 'foreign' });
    expect(r.status).toBe(400);
    expect(s.rows.time_entries).toHaveLength(0);
  });
  it('refuses a shift belonging to another employee in the same workspace', async () => {
    const s = server({ rows: { shifts: [{ id: 'other', employee_id: 'employee-b', tenant_id: 'tenant-a', branch: 'Carnaby', status: 'scheduled' }] } });
    const r = await s.request({ action: 'clock_in', tenant_id: 'tenant-a', branch: 'Carnaby', shift_id: 'other' });
    expect(r.status).toBe(400);
    expect(s.rows.time_entries).toHaveLength(0);
  });
  it('refuses a branch absent from the selected workspace', async () => {
    const s = server();
    expect((await s.request({ action: 'clock_in', tenant_id: 'tenant-a', branch: 'Elsewhere' })).status).toBe(400);
    expect(s.rows.time_entries).toHaveLength(0);
  });
  it('refuses an unknown employee lookup, without inserting a timesheet', async () => {
    const s = server({ fail: 'employees' });
    expect((await s.request({ action: 'clock_in', tenant_id: 'tenant-a', branch: 'Carnaby' })).status).toBe(503);
    expect(s.rows.time_entries).toHaveLength(0);
  });
  it('refuses to choose a different branch when GPS is near Carnaby', async () => {
    const s = server({ rows: { branch_locations: [branch, { ...branch, branch: 'Brixton', latitude: 51.46 }] } });
    const r = await s.request({ action: 'clock_in', tenant_id: 'tenant-a', branch: 'Brixton', latitude: 51.5, longitude: -0.1 });
    expect(r.status).toBe(403);
    expect(s.rows.time_entries).toHaveLength(0);
  });
  it('refuses when available branches cannot be checked', async () => {
    const s = server({ fail: 'branch_locations' });
    expect((await s.request({ action: 'clock_in', tenant_id: 'tenant-a', branch: 'Carnaby' })).status).toBe(503);
  });
  it('refuses to invent a new clock-in when the status read fails', async () => {
    const s = server({ fail: 'time_entries' });
    const r = await s.request({ action: 'clock_in', tenant_id: 'tenant-a', branch: 'Carnaby' });
    expect(r.status, JSON.stringify(r.body)).toBe(503);
    expect(s.rows.time_entries).toHaveLength(0);
  });
  it('refuses duplicate open entries for clock-out', async () => {
    const e = { employee_id: 'employee-a', tenant_id: 'tenant-a', status: 'clocked_in', clock_in_time: '2026-09-26T09:00:00Z' };
    const s = server({ rows: { time_entries: [{ ...e, id: 'first' }, { ...e, id: 'second' }] } });
    expect((await s.request({ action: 'clock_out', tenant_id: 'tenant-a' })).status).toBe(409);
    expect(s.rows.time_entries.every(row => row.status === 'clocked_in')).toBe(true);
  });
  it('accepts a matching shift and uses the validated shift ID', async () => {
    const s = server({ rows: { shifts: [{ id: 'ours', employee_id: 'employee-a', tenant_id: 'tenant-a', branch: 'Carnaby', status: 'scheduled' }] } });
    const r = await s.request({ action: 'clock_in', tenant_id: 'tenant-a', branch: 'Carnaby', shift_id: 'ours' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(s.rows.time_entries[0]).toMatchObject({ employee_id: 'employee-a', tenant_id: 'tenant-a', shift_id: 'ours' });
  });
  it('clocks out its own open entry in the workspace', async () => {
    const s = server({ rows: { time_entries: [{ id: 'ours', employee_id: 'employee-a', tenant_id: 'tenant-a', status: 'clocked_in', clock_in_time: '2026-09-26T09:00:00Z' }] } });
    const r = await s.request({ action: 'clock_out', tenant_id: 'tenant-a' });
    expect(r.status).toBe(200);
    expect(s.rows.time_entries[0]).toHaveProperty('clock_out_time');
  });
});
