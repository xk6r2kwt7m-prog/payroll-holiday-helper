ALTER TABLE public.sandbox_tenants
  ADD COLUMN IF NOT EXISTS last_rebuilt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_impersonated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_qa_note_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_smoke_test_at timestamptz;