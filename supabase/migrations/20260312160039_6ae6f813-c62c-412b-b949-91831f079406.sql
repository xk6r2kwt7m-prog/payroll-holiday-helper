
-- Add per-employee pricing and country pricing support to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS price_per_employee_monthly numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_per_employee_annual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS billing_model text NOT NULL DEFAULT 'per_employee';
