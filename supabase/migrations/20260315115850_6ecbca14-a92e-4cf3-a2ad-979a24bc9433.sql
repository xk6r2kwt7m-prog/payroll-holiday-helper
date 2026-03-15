ALTER TABLE public.sandbox_tenants ADD COLUMN IF NOT EXISTS seed_config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.sandbox_tenants ADD COLUMN IF NOT EXISTS qa_status text;