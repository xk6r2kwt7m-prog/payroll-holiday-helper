CREATE TABLE public.payroll_import_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id UUID NULL,
  source_system TEXT NOT NULL DEFAULT 'uploaded_timesheet',
  raw_timesheet_name TEXT NOT NULL,
  normalised_timesheet_name TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  confirmed_by UUID NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX payroll_import_aliases_active_unique
  ON public.payroll_import_aliases (tenant_id, normalised_timesheet_name, source_system)
  WHERE is_active = true;

CREATE INDEX payroll_import_aliases_tenant_idx
  ON public.payroll_import_aliases (tenant_id, is_active);
CREATE INDEX payroll_import_aliases_employee_idx
  ON public.payroll_import_aliases (employee_id);

ALTER TABLE public.payroll_import_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view import aliases"
  ON public.payroll_import_aliases FOR SELECT
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Managers can insert import aliases"
  ON public.payroll_import_aliases FOR INSERT
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Managers can update import aliases"
  ON public.payroll_import_aliases FOR UPDATE
  USING (public.is_tenant_manager_or_above(tenant_id))
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

CREATE TRIGGER update_payroll_import_aliases_updated_at
  BEFORE UPDATE ON public.payroll_import_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();