
-- Structured location breakdown for payroll entries
CREATE TABLE public.payroll_entry_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_entry_id uuid NOT NULL REFERENCES public.payroll_entries(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  department text,
  hours numeric NOT NULL DEFAULT 0,
  imported_source text DEFAULT 'csv_import',
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_pel_period ON public.payroll_entry_locations(payroll_period_id);
CREATE INDEX idx_pel_entry ON public.payroll_entry_locations(payroll_entry_id);
CREATE INDEX idx_pel_employee ON public.payroll_entry_locations(employee_id);
CREATE INDEX idx_pel_location ON public.payroll_entry_locations(location_name);
CREATE INDEX idx_pel_tenant ON public.payroll_entry_locations(tenant_id);

-- RLS
ALTER TABLE public.payroll_entry_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view location data"
ON public.payroll_entry_locations FOR SELECT TO authenticated
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant admins can manage location data"
ON public.payroll_entry_locations FOR ALL TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));
