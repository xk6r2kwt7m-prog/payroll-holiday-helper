
ALTER TABLE public.company_settings
ADD COLUMN default_signatory_name text DEFAULT NULL,
ADD COLUMN default_signatory_email text DEFAULT NULL;
