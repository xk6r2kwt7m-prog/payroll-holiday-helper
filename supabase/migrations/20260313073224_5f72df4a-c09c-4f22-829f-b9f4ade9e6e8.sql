
-- Daily revenue table for labour cost calculations
CREATE TABLE public.daily_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date date NOT NULL,
  revenue_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, date)
);

ALTER TABLE public.daily_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage daily revenue"
  ON public.daily_revenue FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view daily revenue"
  ON public.daily_revenue FOR SELECT TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant managers can insert daily revenue"
  ON public.daily_revenue FOR INSERT TO authenticated
  WITH CHECK (is_tenant_manager_or_above(tenant_id));

-- Shift alerts table for anomaly detection
CREATE TABLE public.shift_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  time_entry_id uuid REFERENCES public.time_entries(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  alert_message text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage shift alerts"
  ON public.shift_alerts FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can manage shift alerts"
  ON public.shift_alerts FOR ALL TO authenticated
  USING (is_tenant_manager_or_above(tenant_id))
  WITH CHECK (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant supervisors can view shift alerts"
  ON public.shift_alerts FOR SELECT TO authenticated
  USING (is_tenant_supervisor_or_above(tenant_id));
