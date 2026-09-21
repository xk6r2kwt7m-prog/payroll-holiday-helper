ALTER TABLE public.licence_signature_requests
  ADD COLUMN IF NOT EXISTS personal_licence_authority text,
  ADD COLUMN IF NOT EXISTS personal_licence_file_path text,
  ADD COLUMN IF NOT EXISTS personal_licence_confirmed_at timestamptz;