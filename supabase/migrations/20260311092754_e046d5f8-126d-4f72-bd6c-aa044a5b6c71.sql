
-- =====================================================
-- PHASE 2a: Multi-Tenant Foundation Tables
-- =====================================================

-- 1. Tenant status enum
CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');

-- 2. Tenants table (company workspaces)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  country text NOT NULL DEFAULT 'GB',
  timezone text NOT NULL DEFAULT 'Europe/London',
  logo_url text,
  email text,
  address text,
  status public.tenant_status NOT NULL DEFAULT 'active',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Tenant members (maps users to tenants with roles)
CREATE TYPE public.tenant_role AS ENUM ('company_admin', 'manager', 'supervisor', 'employee', 'viewer');

CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.tenant_role NOT NULL DEFAULT 'employee',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- 4. Platform admins (super admins, separate from tenant roles)
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Enable RLS on all new tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 6. Security definer: check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
  )
$$;

-- 7. Security definer: check tenant membership with role
CREATE OR REPLACE FUNCTION public.has_tenant_role(_tenant_id uuid, _role tenant_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant_id
      AND user_id = auth.uid()
      AND role = _role
      AND is_active = true
  )
$$;

-- 8. Security definer: check if user is member of tenant (any role)
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant_id
      AND user_id = auth.uid()
      AND is_active = true
  )
$$;

-- 9. Security definer: check tenant admin or above
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant_id
      AND user_id = auth.uid()
      AND role = 'company_admin'
      AND is_active = true
  ) OR public.is_platform_admin()
$$;

-- 10. Security definer: check tenant manager or above
CREATE OR REPLACE FUNCTION public.is_tenant_manager_or_above(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant_id
      AND user_id = auth.uid()
      AND role IN ('company_admin', 'manager')
      AND is_active = true
  ) OR public.is_platform_admin()
$$;

-- 11. Security definer: check tenant supervisor or above
CREATE OR REPLACE FUNCTION public.is_tenant_supervisor_or_above(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant_id
      AND user_id = auth.uid()
      AND role IN ('company_admin', 'manager', 'supervisor')
      AND is_active = true
  ) OR public.is_platform_admin()
$$;

-- 12. RLS policies for tenants
CREATE POLICY "Platform admins can manage all tenants"
  ON public.tenants FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Tenant members can view their own tenant"
  ON public.tenants FOR SELECT
  USING (
    id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true)
  );

-- 13. RLS policies for tenant_members
CREATE POLICY "Platform admins can manage all members"
  ON public.tenant_members FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Tenant admins can manage members in their tenant"
  ON public.tenant_members FOR ALL
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "Members can view other members in their tenant"
  ON public.tenant_members FOR SELECT
  USING (public.is_tenant_member(tenant_id));

-- 14. RLS policies for platform_admins
CREATE POLICY "Platform admins can view platform admins"
  ON public.platform_admins FOR SELECT
  USING (public.is_platform_admin());

-- Only direct DB access or migrations can insert platform admins (no insert policy for regular users)

-- 15. Updated_at trigger for new tables
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_members_updated_at
  BEFORE UPDATE ON public.tenant_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
