
CREATE TABLE IF NOT EXISTS public.holiday_balance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  leave_year_start date NOT NULL,
  leave_year_end date NOT NULL,
  old_hours_accrued numeric,
  old_hours_taken numeric,
  old_hours_carried_over numeric,
  old_updated_at timestamptz,
  new_hours_accrued numeric,
  new_hours_taken numeric,
  new_hours_carried_over numeric,
  accrued_delta numeric,
  taken_delta numeric,
  carried_over_delta numeric,
  reason text NOT NULL,
  source_table text NOT NULL DEFAULT 'payroll_entries',
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL
);

ALTER TABLE public.holiday_balance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage audit log"
  ON public.holiday_balance_audit_log
  FOR ALL
  TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));
