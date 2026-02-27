
-- Table to record payroll overpayment evidence
CREATE TABLE public.payroll_overpayments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  overlap_start_date DATE NOT NULL,
  overlap_end_date DATE NOT NULL,
  estimated_overlap_hours NUMERIC NOT NULL DEFAULT 0,
  hourly_rate NUMERIC NOT NULL,
  service_charge NUMERIC NOT NULL DEFAULT 0,
  estimated_overpayment NUMERIC NOT NULL DEFAULT 0,
  recovery_status TEXT NOT NULL DEFAULT 'identified',
  recovery_method TEXT,
  recovered_amount NUMERIC DEFAULT 0,
  recovered_in_period_id UUID REFERENCES public.payroll_periods(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_overpayments ENABLE ROW LEVEL SECURITY;

-- Only admin access
CREATE POLICY "Admins can manage overpayments"
  ON public.payroll_overpayments FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Only admins can view overpayments"
  ON public.payroll_overpayments FOR SELECT
  USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_payroll_overpayments_updated_at
  BEFORE UPDATE ON public.payroll_overpayments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
