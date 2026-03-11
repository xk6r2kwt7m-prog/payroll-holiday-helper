
-- Add feature flag modules to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS enabled_modules jsonb NOT NULL DEFAULT '{"scheduling":true,"payroll":true,"training":true,"documents":true,"analytics":true}';

-- Fix handle_new_user trigger: remove auto-admin assignment (provision-tenant handles this)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;
