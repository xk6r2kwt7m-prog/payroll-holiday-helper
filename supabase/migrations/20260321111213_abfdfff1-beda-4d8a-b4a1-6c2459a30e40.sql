
ALTER TABLE public.employee_onboarding_data 
ADD COLUMN IF NOT EXISTS rtw_status text NOT NULL DEFAULT 'not_submitted',
ADD COLUMN IF NOT EXISTS rtw_reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS rtw_reviewed_by uuid,
ADD COLUMN IF NOT EXISTS rtw_review_notes text,
ADD COLUMN IF NOT EXISTS onboarding_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS onboarding_approved_by uuid;
