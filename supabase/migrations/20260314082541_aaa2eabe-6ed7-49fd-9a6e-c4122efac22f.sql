
-- Sandbox tenants tracking table
CREATE TABLE public.sandbox_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  preset_name text NOT NULL DEFAULT 'empty',
  setup_state text NOT NULL DEFAULT 'new_signup',
  test_users jsonb NOT NULL DEFAULT '[]'::jsonb,
  testing_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.sandbox_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage sandbox tenants"
  ON public.sandbox_tenants FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Impersonation audit log
CREATE TABLE public.impersonation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_admin_id uuid NOT NULL,
  sandbox_tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  impersonated_role text NOT NULL,
  impersonated_user_label text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.impersonation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage impersonation log"
  ON public.impersonation_log FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
