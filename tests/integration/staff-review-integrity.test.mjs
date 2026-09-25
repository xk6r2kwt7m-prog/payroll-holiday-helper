import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('RTW database rejects missing evidence, wrong ownership and incomplete student checks', async () => {
 const db = new PGlite();
 try {
 await db.exec(`CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
 CREATE FUNCTION public.is_tenant_manager_or_above(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1 = '00000000-0000-0000-0000-000000000010'::uuid $$;
 CREATE FUNCTION public.is_tenant_admin(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
 CREATE FUNCTION public.can_view_employee(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1 = '00000000-0000-0000-0000-000000000020'::uuid $$;
 CREATE TABLE employees(id uuid PRIMARY KEY, tenant_id uuid);
 CREATE TABLE employee_documents(id uuid PRIMARY KEY, tenant_id uuid, employee_id uuid, file_path text);
 INSERT INTO employees VALUES ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000010'),('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000011');
 INSERT INTO employee_documents VALUES ('00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000020','evidence.pdf'),('00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000021','other.pdf');`);
 await db.exec(readFileSync('drizzle/migrations/0036_create_right_to_work_checks.sql','utf8'));
 await db.exec(readFileSync('drizzle/migrations/0037_staff_review_integrity.sql','utf8'));
 await db.exec('GRANT USAGE ON SCHEMA auth TO authenticated; GRANT SELECT ON employees TO authenticated; SET ROLE authenticated');
 const base = {tenant_id:'00000000-0000-0000-0000-000000000010',employee_id:'00000000-0000-0000-0000-000000000020',checked_by:'00000000-0000-0000-0000-000000000001',check_method:'online_share_code',checked_on:'2026-01-01',result:'unlimited',evidence_document_id:'00000000-0000-0000-0000-000000000030'};
 const insert = (changes={}) => { const row={...base,...changes}; return db.query(`INSERT INTO right_to_work_checks (${Object.keys(row).join(',')}) VALUES (${Object.keys(row).map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row)); };
 await insert();
 await assert.rejects(insert({evidence_document_id:null}), /requires evidence/);
 await assert.rejects(insert({employee_id:'00000000-0000-0000-0000-000000000021'}), /same workspace/);
 await assert.rejects(insert({evidence_document_id:'00000000-0000-0000-0000-000000000031'}), /Evidence must belong/);
 await assert.rejects(insert({checked_by:'00000000-0000-0000-0000-000000000002'}), /Not authorised/);
 await assert.rejects(insert({checked_on:'2999-01-01'}), /future/);
 await assert.rejects(insert({is_student:true}), /Student clearance requires/);
 await assert.rejects(insert({is_student:true,study_dates:'Course term dates',work_restrictions:'As checked',student_evidence_document_id:'00000000-0000-0000-0000-000000000031'}), /Student evidence must belong/);
 await insert({is_student:true,study_dates:'Provider, course, term and vacation dates',work_restrictions:'Actual permission checked',student_evidence_document_id:base.evidence_document_id});
 await assert.rejects(insert({result:'ecs_pending',evidence_document_id:null}), /ECS/);
 await insert({result:'ecs_pending',check_method:'employer_checking_service',notes:'Application pending; case submitted',evidence_document_id:null});
 await assert.rejects(insert({result:'time_limited',permission_expires_on:'2025-01-01'}), /expire before/);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM right_to_work_checks')).rows[0].n,3);
 } finally { await db.close(); }
});
