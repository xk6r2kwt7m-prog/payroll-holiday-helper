
-- Create holiday_adjustments table for manual corrections with audit trail
CREATE TABLE public.holiday_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('accrued', 'taken', 'carried_over')),
  hours NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  leave_year_start DATE NOT NULL,
  leave_year_end DATE NOT NULL,
  adjusted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.holiday_adjustments ENABLE ROW LEVEL SECURITY;

-- Only admins can manage adjustments
CREATE POLICY "Admins can manage holiday adjustments"
  ON public.holiday_adjustments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can view holiday adjustments"
  ON public.holiday_adjustments
  FOR SELECT
  USING (is_admin());
