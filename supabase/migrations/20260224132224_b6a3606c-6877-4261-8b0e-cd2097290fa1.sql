
-- Schedule templates: saved rota patterns
CREATE TABLE public.schedule_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  department TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template shifts: individual shifts within a template
CREATE TABLE public.schedule_template_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.schedule_templates(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon, 6=Sun
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_template_shifts ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage schedule templates"
ON public.schedule_templates FOR ALL
USING (public.is_admin());

CREATE POLICY "Admins can manage template shifts"
ON public.schedule_template_shifts FOR ALL
USING (public.is_admin());

-- Indexes
CREATE INDEX idx_schedule_template_shifts_template ON public.schedule_template_shifts(template_id);
CREATE INDEX idx_schedule_templates_branch_dept ON public.schedule_templates(branch, department);
