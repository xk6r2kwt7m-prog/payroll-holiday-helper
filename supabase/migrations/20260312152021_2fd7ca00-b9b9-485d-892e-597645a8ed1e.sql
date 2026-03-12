
-- 1. Add employee contract/pay fields
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employing_entity text,
  ADD COLUMN IF NOT EXISTS contract_country text DEFAULT 'GB',
  ADD COLUMN IF NOT EXISTS work_country text,
  ADD COLUMN IF NOT EXISTS work_region text,
  ADD COLUMN IF NOT EXISTS pay_type text DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS pay_amount numeric,
  ADD COLUMN IF NOT EXISTS holiday_entitlement_method text DEFAULT 'accrual',
  ADD COLUMN IF NOT EXISTS public_holiday_calendar text,
  ADD COLUMN IF NOT EXISTS overtime_model text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS service_charge_eligible boolean DEFAULT true;

-- 2. Add tenant-level config columns
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS payroll_frequency text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS default_pay_model text DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS service_charge_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS work_countries text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS compliance_notes text;

-- 3. Insert Cape Verde country rules (if not exists)
INSERT INTO public.country_leave_rules (
  country_code, country_name, statutory_weeks, max_statutory_days,
  accrual_rate, standard_week_hours, standard_day_hours, workdays_per_week,
  max_carryover_days, max_carryover_sickness_days, max_carryover_family_leave_days,
  default_leave_year_start_month, default_leave_year_start_day,
  public_holidays_included, public_holiday_count, notes
) VALUES (
  'CV', 'Cape Verde', 4.4, 22,
  0.0846, 44, 8, 6,
  0, 0, 0,
  1, 1,
  true, 9,
  'Código Laboral de Cabo Verde: 22 working days annual leave for qualifying employees. Proportional leave for contracts under 1 year. Night work: 22:00-06:00. Leave scheduling by agreement, employer holiday map where no agreement exists.'
) ON CONFLICT DO NOTHING;

-- 4. Insert Portugal country rules (if not exists)
INSERT INTO public.country_leave_rules (
  country_code, country_name, statutory_weeks, max_statutory_days,
  accrual_rate, standard_week_hours, standard_day_hours, workdays_per_week,
  max_carryover_days, max_carryover_sickness_days, max_carryover_family_leave_days,
  default_leave_year_start_month, default_leave_year_start_day,
  public_holidays_included, public_holiday_count, notes
) VALUES (
  'PT', 'Portugal', 4.4, 22,
  0.0846, 40, 8, 5,
  0, 0, 0,
  1, 1,
  true, 13,
  'Código do Trabalho: 22 working days annual leave. Public holidays: 13 national days. Leave year: Jan-Dec.'
) ON CONFLICT DO NOTHING;
