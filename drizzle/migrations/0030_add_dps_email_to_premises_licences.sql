ALTER TABLE public.premises_licences
  ADD COLUMN IF NOT EXISTS dps_email TEXT;

COMMENT ON COLUMN public.premises_licences.dps_email IS
  'Email address of the Designated Premises Supervisor, used as the default when requesting his signature. Optional.';