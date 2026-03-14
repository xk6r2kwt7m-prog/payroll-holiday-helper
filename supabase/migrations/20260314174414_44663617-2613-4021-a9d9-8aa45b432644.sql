
-- 1. DEPARTMENTS TABLE
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📋',
  description TEXT DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, key)
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view departments" ON public.departments FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "Tenant admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

-- 2. ROLE PERMISSIONS TABLE
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, role, permission_key)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view role permissions" ON public.role_permissions FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "Tenant admins can manage role permissions" ON public.role_permissions FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

-- 3. TENANT PREFERENCES TABLE
CREATE TABLE public.tenant_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, category)
);
ALTER TABLE public.tenant_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can view preferences" ON public.tenant_preferences FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "Tenant admins can manage preferences" ON public.tenant_preferences FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

-- 4. Convert department enum to text
DROP VIEW IF EXISTS public.employees_safe;
ALTER TABLE public.employees ALTER COLUMN department TYPE text;
ALTER TABLE public.shifts ALTER COLUMN department TYPE text;
ALTER TABLE public.time_entries ALTER COLUMN department TYPE text;
DROP TYPE IF EXISTS public.department_type;

-- Recreate view
CREATE VIEW public.employees_safe WITH (security_invoker = true) AS
SELECT id, tenant_id, forename, surname, department, status,
       start_date, end_date, employee_ref, created_at, updated_at,
       user_id, archived_at, notes, nationality
FROM employees;

-- 5. Seed defaults
INSERT INTO public.departments (tenant_id, key, label, emoji, description, is_system, sort_order)
SELECT t.id, d.key, d.label, d.emoji, d.description, true, d.sort_order
FROM public.tenants t
CROSS JOIN (VALUES
  ('FOH', 'Front of House', '🍽️', 'Customer-facing roles', 0),
  ('BOH', 'Back of House', '👨‍🍳', 'Kitchen & prep roles', 1),
  ('CPU', 'Central Production', '🏭', 'Central production unit', 2)
) AS d(key, label, emoji, description, sort_order)
ON CONFLICT (tenant_id, key) DO NOTHING;

-- 6. Seed helper function
CREATE OR REPLACE FUNCTION public.seed_default_departments(_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.departments (tenant_id, key, label, emoji, description, is_system, sort_order)
  VALUES
    (_tenant_id, 'FOH', 'Front of House', '🍽️', 'Customer-facing roles', true, 0),
    (_tenant_id, 'BOH', 'Back of House', '👨‍🍳', 'Kitchen & prep roles', true, 1),
    (_tenant_id, 'CPU', 'Central Production', '🏭', 'Central production unit', true, 2)
  ON CONFLICT (tenant_id, key) DO NOTHING;
END;
$$;
