
-- Add founding partner fields to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS founding_partner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_partner_expires_at timestamp with time zone DEFAULT NULL;
