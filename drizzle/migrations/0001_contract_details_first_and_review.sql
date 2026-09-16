ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS requires_details_first boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS details_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_accepted_by uuid;