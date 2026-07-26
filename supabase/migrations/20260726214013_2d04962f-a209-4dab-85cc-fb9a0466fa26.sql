ALTER TABLE public.payroll_period_notes
  ADD COLUMN IF NOT EXISTS show_on_pdf boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category text;