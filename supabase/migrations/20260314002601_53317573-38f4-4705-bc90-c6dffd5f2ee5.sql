
-- Service charge role rates table
CREATE TABLE public.service_charge_role_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  rate_per_hour numeric NOT NULL DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_charge_role_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage sc role rates" ON public.service_charge_role_rates
  FOR ALL TO authenticated USING (is_tenant_admin(tenant_id)) WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view sc role rates" ON public.service_charge_role_rates
  FOR SELECT TO authenticated USING (is_tenant_manager_or_above(tenant_id));

-- Service charge employee rates table
CREATE TABLE public.service_charge_employee_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  custom_rate_per_hour numeric NOT NULL DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_charge_employee_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage sc employee rates" ON public.service_charge_employee_rates
  FOR ALL TO authenticated USING (is_tenant_admin(tenant_id)) WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view sc employee rates" ON public.service_charge_employee_rates
  FOR SELECT TO authenticated USING (is_tenant_manager_or_above(tenant_id));

-- Service charge location settings
CREATE TABLE public.service_charge_location_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  calculation_model text NOT NULL DEFAULT 'equal_by_hours',
  default_rate_per_hour numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, branch)
);

ALTER TABLE public.service_charge_location_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage sc location settings" ON public.service_charge_location_settings
  FOR ALL TO authenticated USING (is_tenant_admin(tenant_id)) WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant members can view sc location settings" ON public.service_charge_location_settings
  FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));
