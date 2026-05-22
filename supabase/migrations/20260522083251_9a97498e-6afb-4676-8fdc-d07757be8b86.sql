
ALTER TABLE public.schedule_templates
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'department',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.schedule_template_shifts
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS required_headcount integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS break_minutes integer;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_schedule_template_default
  ON public.schedule_templates (tenant_id, branch, department)
  WHERE is_default = true AND is_archived = false;
