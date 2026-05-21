
CREATE TABLE public.payroll_nmw_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  payroll_period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  payroll_entry_id uuid REFERENCES public.payroll_entries(id) ON DELETE SET NULL,
  employee_id uuid NOT NULL,
  age_at_period_start integer,
  age_band text NOT NULL,
  is_apprentice boolean NOT NULL DEFAULT false,
  required_rate numeric(10,4) NOT NULL,
  effective_rate numeric(10,4),
  eligible_pay numeric(12,2) NOT NULL DEFAULT 0,
  actual_hours numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('compliant','at_risk','non_compliant','insufficient_data')),
  calculation_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  override_reason text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_nmw_audit_period ON public.payroll_nmw_audit(payroll_period_id);
CREATE INDEX idx_payroll_nmw_audit_employee ON public.payroll_nmw_audit(employee_id);
CREATE INDEX idx_payroll_nmw_audit_tenant ON public.payroll_nmw_audit(tenant_id);

ALTER TABLE public.payroll_nmw_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant managers can view NMW audit"
ON public.payroll_nmw_audit FOR SELECT
TO authenticated
USING (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant managers can insert NMW audit"
ON public.payroll_nmw_audit FOR INSERT
TO authenticated
WITH CHECK (public.is_tenant_manager_or_above(tenant_id));
