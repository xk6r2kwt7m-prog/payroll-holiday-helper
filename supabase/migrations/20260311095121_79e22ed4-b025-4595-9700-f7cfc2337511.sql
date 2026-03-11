
-- Phase 4: Country leave rules & tenant-level settings
-- ============================================================

-- 1. Country leave rules table (system defaults per country)
CREATE TABLE public.country_leave_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  -- Leave entitlement
  statutory_weeks numeric NOT NULL DEFAULT 5.6,
  max_statutory_days integer NOT NULL DEFAULT 28,
  accrual_rate numeric NOT NULL DEFAULT 0.1207,
  -- Workweek
  standard_week_hours numeric NOT NULL DEFAULT 40,
  standard_day_hours numeric NOT NULL DEFAULT 8,
  workdays_per_week integer NOT NULL DEFAULT 5,
  -- Carry-over
  max_carryover_days integer NOT NULL DEFAULT 8,
  max_carryover_sickness_days integer NOT NULL DEFAULT 20,
  max_carryover_family_leave_days integer NOT NULL DEFAULT 28,
  -- Leave year default
  default_leave_year_start_month integer NOT NULL DEFAULT 1,  -- January
  default_leave_year_start_day integer NOT NULL DEFAULT 1,
  -- Public holidays
  public_holidays_included boolean NOT NULL DEFAULT true,
  public_holiday_count integer NOT NULL DEFAULT 8,
  -- Metadata
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.country_leave_rules ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read country rules (reference data)
CREATE POLICY "Authenticated users can view country rules"
  ON public.country_leave_rules FOR SELECT TO authenticated
  USING (true);

-- Only platform admins can manage
CREATE POLICY "Platform admins can manage country rules"
  ON public.country_leave_rules FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- 2. Tenant leave settings (overrides per tenant)
CREATE TABLE public.tenant_leave_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  -- Override fields (null = use country default)
  accrual_rate numeric,
  standard_week_hours numeric,
  standard_day_hours numeric,
  workdays_per_week integer,
  max_carryover_days integer,
  leave_year_start_month integer,
  leave_year_start_day integer,
  -- Custom settings
  auto_calculate_accrual boolean NOT NULL DEFAULT true,
  include_service_charge_in_holiday boolean NOT NULL DEFAULT false,
  rounding_precision integer NOT NULL DEFAULT 2,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_leave_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage leave settings"
  ON public.tenant_leave_settings FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant members can view leave settings"
  ON public.tenant_leave_settings FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

-- Index
CREATE INDEX idx_tenant_leave_settings_tenant ON public.tenant_leave_settings(tenant_id);
