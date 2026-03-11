
-- Add pending_setup to tenant_status enum
ALTER TYPE tenant_status ADD VALUE IF NOT EXISTS 'pending_setup';

-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_annual numeric NOT NULL DEFAULT 0,
  max_employees integer,
  max_locations integer DEFAULT 1,
  enabled_modules jsonb NOT NULL DEFAULT '{"scheduling": true}'::jsonb,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Platform admins can manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================
-- TENANT SUBSCRIPTIONS
-- ============================================================
CREATE TABLE public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  trial_ends_at timestamptz,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  stripe_customer_id text,
  stripe_subscription_id text,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view own subscription" ON public.tenant_subscriptions
  FOR SELECT TO authenticated
  USING (is_tenant_admin(tenant_id));

CREATE POLICY "Platform admins can manage subscriptions" ON public.tenant_subscriptions
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ============================================================
-- BILLING EVENTS
-- ============================================================
CREATE TABLE public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id),
  event_type text NOT NULL,
  amount numeric,
  currency text DEFAULT 'gbp',
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  stripe_event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage billing events" ON public.billing_events
  FOR ALL TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "Tenant admins can view own billing events" ON public.billing_events
  FOR SELECT TO authenticated
  USING (is_tenant_admin(tenant_id));

-- ============================================================
-- TENANT TEMPLATES
-- ============================================================
CREATE TABLE public.tenant_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  business_type text NOT NULL DEFAULT 'restaurant',
  icon text DEFAULT '🍽️',
  is_platform_template boolean NOT NULL DEFAULT false,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view platform templates" ON public.tenant_templates
  FOR SELECT TO authenticated
  USING (is_platform_template = true AND is_active = true);

CREATE POLICY "Tenant admins can manage own templates" ON public.tenant_templates
  FOR ALL TO authenticated
  USING (
    (tenant_id IS NOT NULL AND is_tenant_admin(tenant_id))
    OR is_platform_admin()
  )
  WITH CHECK (
    (tenant_id IS NOT NULL AND is_tenant_admin(tenant_id))
    OR is_platform_admin()
  );

-- ============================================================
-- TENANT INVITATIONS
-- ============================================================
CREATE TABLE public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role tenant_role NOT NULL DEFAULT 'employee',
  invited_by uuid,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage invitations" ON public.tenant_invitations
  FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- TENANT ONBOARDING STATE
-- ============================================================
CREATE TABLE public.tenant_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  current_step integer NOT NULL DEFAULT 1,
  completed_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  wizard_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage onboarding state" ON public.tenant_onboarding_state
  FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Platform admins can view onboarding state" ON public.tenant_onboarding_state
  FOR SELECT TO authenticated
  USING (is_platform_admin());
