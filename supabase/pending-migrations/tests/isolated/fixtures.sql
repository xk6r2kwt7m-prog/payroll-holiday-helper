GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
INSERT INTO auth.users(id,email) VALUES
 ('11111111-1111-1111-1111-111111111111','admin-a@example.test'),('22222222-2222-2222-2222-222222222222','manager@example.test'),
 ('33333333-3333-3333-3333-333333333333','staff@example.test'),('44444444-4444-4444-4444-444444444444','admin-b@example.test'),
 ('55555555-5555-5555-5555-555555555555','supervisor@example.test');
INSERT INTO tenants(id,name,slug) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','Test Co A','test-a'),('bbbbbbbb-bbbb-bbbb-bbbb-00000000000b','Test Co B','test-b');
INSERT INTO tenant_members(tenant_id,user_id,role,is_active) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','11111111-1111-1111-1111-111111111111','company_admin',true),
 ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','22222222-2222-2222-2222-222222222222','manager',true),
 ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','33333333-3333-3333-3333-333333333333','employee',true),
 ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','55555555-5555-5555-5555-555555555555','supervisor',true),
 ('bbbbbbbb-bbbb-bbbb-bbbb-00000000000b','44444444-4444-4444-4444-444444444444','company_admin',true);
INSERT INTO employees(id,tenant_id,forename,surname,department,hourly_rate,status,bank_account_no,sort_code,email) VALUES
 ('e1000000-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','Testa','Person','FOH',12.21,'active','12345678','112233','testa@example.test'),
 ('e2000000-0000-0000-0000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','Testb','Other','BOH',13.00,'active',null,null,null);
-- F = deprecated-Feb-like draft: stored totals, no entries, no holiday payments, 1 import, 3 overpayments
INSERT INTO payroll_periods(id,tenant_id,period_name,start_date,end_date,status,timesheet_total,incentives_total,holidays_total,grand_total) VALUES
 ('f0000000-0000-0000-0000-00000000000f','aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','Feb TEST [DEPRECATED]','2026-01-19','2026-02-22','draft',69119.90,0,7660.35,76780.25),
 ('c0000000-0000-0000-0000-00000000000c','aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','Dec TEST Corrected','2025-12-01','2025-12-28','draft',0,0,0,0),
 ('90000000-0000-0000-0000-000000000009','aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','Mar TEST (entries)','2026-02-23','2026-03-22','draft',0,0,0,0);
INSERT INTO payroll_imports(id,tenant_id,file_name,payroll_period_id) VALUES ('10000000-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','feb.csv','f0000000-0000-0000-0000-00000000000f');
INSERT INTO payroll_overpayments(id,tenant_id,payroll_period_id,employee_id,overlap_start_date,overlap_end_date,hourly_rate)
 SELECT gen_random_uuid(),'aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','f0000000-0000-0000-0000-00000000000f','e1000000-0000-0000-0000-000000000001','2026-01-19','2026-01-25',12.21 FROM generate_series(1,3);
INSERT INTO payroll_entries(id,tenant_id,payroll_period_id,employee_id,hourly_rate,timesheet_hours) VALUES
 ('ee000000-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','90000000-0000-0000-0000-000000000009','e1000000-0000-0000-0000-000000000001',12.21,100),
 ('ee000000-0000-0000-0000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','90000000-0000-0000-0000-000000000009','e2000000-0000-0000-0000-000000000002',13.00,50);
INSERT INTO audit_log(tenant_id,action,table_name,record_id,new_data) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','update','payroll_periods','f0000000-0000-0000-0000-00000000000f','{"note":"history 1"}'),
 ('aaaaaaaa-aaaa-aaaa-aaaa-00000000000a','update','payroll_periods','f0000000-0000-0000-0000-00000000000f','{"note":"history 2"}');
