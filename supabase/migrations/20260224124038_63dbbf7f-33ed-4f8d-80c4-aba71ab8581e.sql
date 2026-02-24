
-- ============================================
-- 1. ABSENCE RECORDS (sick, appointment, etc.)
-- ============================================
CREATE TABLE public.absence_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  absence_type TEXT NOT NULL DEFAULT 'sick', -- sick, appointment, unauthorised, compassionate, maternity, paternity, other
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.absence_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage absence records"
  ON public.absence_records FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Only admins can view absence records"
  ON public.absence_records FOR SELECT
  USING (is_admin());

CREATE INDEX idx_absence_records_employee ON public.absence_records(employee_id);
CREATE INDEX idx_absence_records_dates ON public.absence_records(start_date, end_date);

-- ============================================
-- 2. ONBOARDING CHECKLISTS
-- ============================================

-- Template items (reusable across all starters)
CREATE TABLE public.onboarding_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- documents, training, equipment, general
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage onboarding templates"
  ON public.onboarding_templates FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Only admins can view onboarding templates"
  ON public.onboarding_templates FOR SELECT
  USING (is_admin());

-- Per-employee checklist progress
CREATE TABLE public.onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, template_id)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage onboarding progress"
  ON public.onboarding_progress FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Only admins can view onboarding progress"
  ON public.onboarding_progress FOR SELECT
  USING (is_admin());

CREATE INDEX idx_onboarding_progress_employee ON public.onboarding_progress(employee_id);

-- Seed default onboarding template items
INSERT INTO public.onboarding_templates (title, description, category, sort_order) VALUES
  ('Right to Work check', 'Verify passport/visa/share code', 'documents', 1),
  ('Signed contract', 'Employment contract signed by both parties', 'documents', 2),
  ('Bank details collected', 'Sort code and account number for payroll', 'documents', 3),
  ('NI number recorded', 'National Insurance number on file', 'documents', 4),
  ('P45 or starter declaration', 'Tax form from previous employer or new starter form', 'documents', 5),
  ('Uniform issued', 'All uniform items provided', 'equipment', 6),
  ('Keys / access card', 'Building access provided', 'equipment', 7),
  ('Health & safety induction', 'H&S walkthrough completed', 'training', 8),
  ('Food hygiene briefing', 'Allergen and food safety awareness', 'training', 9),
  ('Till / POS training', 'Point of sale system training (FOH)', 'training', 10),
  ('Kitchen station training', 'Station walkthrough and prep standards (BOH)', 'training', 11),
  ('Emergency procedures', 'Fire exits, first aid, incident reporting', 'training', 12),
  ('Team introduction', 'Introduced to team and key contacts', 'general', 13),
  ('Probation review date set', 'Calendar reminder for probation check-in', 'general', 14);
