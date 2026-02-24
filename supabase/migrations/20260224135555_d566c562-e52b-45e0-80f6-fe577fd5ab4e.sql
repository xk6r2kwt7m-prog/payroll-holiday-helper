-- Add company logo URL field to company_settings
ALTER TABLE public.company_settings
ADD COLUMN company_logo_url text DEFAULT NULL;