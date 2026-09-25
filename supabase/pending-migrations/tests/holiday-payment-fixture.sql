-- Minimal disposable schema, based on committed table/enum definitions.
-- Deliberately not a production clone: full deployed-schema validation is a release gate.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TYPE payroll_status AS ENUM ('draft','pending','rejected','approved');
CREATE TYPE audit_action AS ENUM ('create','update','delete','approve','reject','import');
CREATE TYPE holiday_ledger_entry_type AS ENUM ('accrual','carry_over_in','holiday_taken','manual_adjustment','correction','payout_on_termination','carry_over_out','expiry');
CREATE TABLE tenants(id uuid PRIMARY KEY);
CREATE TABLE tenant_members(tenant_id uuid REFERENCES tenants, user_id uuid, role text, is_active boolean);
CREATE TABLE employees(id uuid PRIMARY KEY, tenant_id uuid REFERENCES tenants, forename text, surname text, status text DEFAULT 'active', end_date date);
CREATE TABLE payroll_periods(id uuid PRIMARY KEY, tenant_id uuid REFERENCES tenants, period_name text, status payroll_status DEFAULT 'draft', start_date date, end_date date,
 timesheet_total numeric DEFAULT 0, holidays_total numeric DEFAULT 0, grand_total numeric DEFAULT 0, approved_by uuid, approved_at timestamptz, updated_at timestamptz DEFAULT now());
CREATE TABLE payroll_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenants,
 payroll_period_id uuid REFERENCES payroll_periods ON DELETE CASCADE, employee_id uuid REFERENCES employees,
 total_pay numeric(12,2) DEFAULT 0, holiday_accrued_hours numeric(8,2) DEFAULT 0);
CREATE TABLE holiday_payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants,
 payroll_period_id uuid NOT NULL REFERENCES payroll_periods ON DELETE CASCADE, employee_id uuid REFERENCES employees ON DELETE SET NULL,
 employee_name text NOT NULL, hours numeric(8,2) NOT NULL, rate numeric(8,2) NOT NULL, total numeric(10,2) NOT NULL,
 holiday_taken_date date, leave_year_start date, leave_year_end date, notes text, created_at timestamptz DEFAULT now());
CREATE TABLE holiday_ledger(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid NOT NULL REFERENCES employees,
 tenant_id uuid NOT NULL REFERENCES tenants, leave_year_start date NOT NULL, entry_date date NOT NULL DEFAULT CURRENT_DATE,
 entry_type holiday_ledger_entry_type NOT NULL, hours numeric NOT NULL, amount numeric, source_table text, source_id uuid, notes text, created_by uuid, created_at timestamptz DEFAULT now());
CREATE UNIQUE INDEX uq_holiday_ledger_source ON holiday_ledger(source_table, source_id, entry_type)
 WHERE source_table IS NOT NULL AND source_id IS NOT NULL AND entry_type <> 'correction';
CREATE TABLE audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, action audit_action, table_name text, record_id uuid, tenant_id uuid, old_data jsonb, new_data jsonb);
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

ALTER TABLE holiday_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_ledger_access ON holiday_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
