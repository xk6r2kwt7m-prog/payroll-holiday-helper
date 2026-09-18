ALTER TABLE public.employee_info_requests
  ADD COLUMN IF NOT EXISTS request_kind text NOT NULL DEFAULT 'onboarding',
  ADD COLUMN IF NOT EXISTS preset text,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS replaced_by uuid REFERENCES public.employee_info_requests(id) ON DELETE SET NULL;

ALTER TABLE public.employee_info_requests
  DROP CONSTRAINT IF EXISTS employee_info_requests_request_kind_check;

ALTER TABLE public.employee_info_requests
  ADD CONSTRAINT employee_info_requests_request_kind_check
  CHECK (request_kind IN ('onboarding', 'existing_staff_update'));

CREATE INDEX IF NOT EXISTS idx_employee_info_requests_kind
  ON public.employee_info_requests (tenant_id, request_kind, sent_at DESC);