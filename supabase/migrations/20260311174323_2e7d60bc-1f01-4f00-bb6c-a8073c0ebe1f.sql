
-- Create entry_type enum for holiday ledger
CREATE TYPE public.holiday_ledger_entry_type AS ENUM (
  'accrual',
  'carry_over_in',
  'holiday_taken',
  'manual_adjustment',
  'correction',
  'payout_on_termination',
  'carry_over_out',
  'expiry'
);

-- Create the holiday_ledger table
CREATE TABLE public.holiday_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  leave_year_start date NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_type public.holiday_ledger_entry_type NOT NULL,
  hours numeric NOT NULL DEFAULT 0,
  amount numeric,
  source_table text,
  source_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate ledger entries for the same source record
-- (corrections are excluded via entry_type not being in the constraint — they use a different entry_type)
CREATE UNIQUE INDEX uq_holiday_ledger_source
  ON public.holiday_ledger (source_table, source_id, entry_type)
  WHERE source_table IS NOT NULL AND source_id IS NOT NULL AND entry_type != 'correction';

-- Index for fast per-employee per-year queries
CREATE INDEX idx_holiday_ledger_employee_year
  ON public.holiday_ledger (employee_id, leave_year_start);

-- Enable RLS
ALTER TABLE public.holiday_ledger ENABLE ROW LEVEL SECURITY;

-- RLS: tenant admins full access
CREATE POLICY "Tenant admins can manage holiday ledger"
  ON public.holiday_ledger
  FOR ALL
  TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- RLS: managers can view
CREATE POLICY "Tenant managers can view holiday ledger"
  ON public.holiday_ledger
  FOR SELECT
  TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));
