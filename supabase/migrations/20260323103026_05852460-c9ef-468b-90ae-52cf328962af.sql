
-- Table for structured payroll adjustment audit trail
CREATE TABLE public.payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  payroll_entry_id uuid NOT NULL REFERENCES public.payroll_entries(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  field_name text NOT NULL,
  old_value numeric,
  new_value numeric,
  delta numeric GENERATED ALWAYS AS (new_value - old_value) STORED,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view adjustments"
  ON public.payroll_adjustments FOR SELECT
  TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant admins can insert adjustments"
  ON public.payroll_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id));

-- Table for period-specific internal notes (separate from employee master notes)
CREATE TABLE public.payroll_period_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  note text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_period_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view period notes"
  ON public.payroll_period_notes FOR SELECT
  TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant admins can manage period notes"
  ON public.payroll_period_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins can update period notes"
  ON public.payroll_period_notes FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins can delete period notes"
  ON public.payroll_period_notes FOR DELETE
  TO authenticated
  USING (public.is_tenant_admin(tenant_id));

-- Indexes
CREATE INDEX idx_payroll_adjustments_entry ON public.payroll_adjustments(payroll_entry_id);
CREATE INDEX idx_payroll_adjustments_period ON public.payroll_adjustments(payroll_period_id);
CREATE INDEX idx_payroll_adjustments_employee ON public.payroll_adjustments(employee_id);
CREATE INDEX idx_payroll_period_notes_period ON public.payroll_period_notes(payroll_period_id);
CREATE INDEX idx_payroll_period_notes_employee ON public.payroll_period_notes(employee_id);
