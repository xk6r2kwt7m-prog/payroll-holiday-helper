
-- 1. Add plan versioning to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS plan_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.subscription_plans(id) DEFAULT NULL;

-- 2. Add price locking and grace period to tenant_subscriptions
ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS price_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_price_per_employee numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS locked_currency text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_version_at_signup integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grace_period_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS payment_due_date timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamp with time zone DEFAULT NULL;

-- 3. Create employee usage tracking table
CREATE TABLE IF NOT EXISTS public.employee_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  active_employee_count integer NOT NULL DEFAULT 0,
  employees_added integer NOT NULL DEFAULT 0,
  employees_removed integer NOT NULL DEFAULT 0,
  plan_id uuid REFERENCES public.subscription_plans(id),
  price_per_employee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  total_amount numeric NOT NULL DEFAULT 0,
  snapshot_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, billing_period_start)
);

-- RLS for employee_usage
ALTER TABLE public.employee_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage employee usage"
  ON public.employee_usage FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Tenant admins can view own usage"
  ON public.employee_usage FOR SELECT
  TO authenticated
  USING (public.is_tenant_admin(tenant_id));
