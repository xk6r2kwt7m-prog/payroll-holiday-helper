
-- Admin notes for tracking employee-specific reminders
CREATE TABLE public.admin_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_period_id UUID REFERENCES public.payroll_periods(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage notes
CREATE POLICY "Admins can manage admin notes"
  ON public.admin_notes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can view admin notes"
  ON public.admin_notes FOR SELECT
  USING (is_admin());

-- Auto-update timestamp
CREATE TRIGGER update_admin_notes_updated_at
  BEFORE UPDATE ON public.admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast employee lookups
CREATE INDEX idx_admin_notes_employee_id ON public.admin_notes(employee_id);
CREATE INDEX idx_admin_notes_status ON public.admin_notes(status);
