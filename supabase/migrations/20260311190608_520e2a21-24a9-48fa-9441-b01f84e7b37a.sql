-- ============================================================
-- FIX 1: Cross-tenant privilege escalation on time_entries
-- Replace non-tenant-scoped functions with tenant-scoped ones
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Managers can manage time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Supervisors can view time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Staff can view own time entries" ON public.time_entries;

CREATE POLICY "Tenant admins can manage time entries"
  ON public.time_entries FOR ALL
  TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can manage time entries"
  ON public.time_entries FOR ALL
  TO authenticated
  USING (is_tenant_manager_or_above(tenant_id))
  WITH CHECK (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant supervisors can view time entries"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (is_tenant_supervisor_or_above(tenant_id));

CREATE POLICY "Staff can view own time entries"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (
    is_tenant_member(tenant_id) AND
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- FIX 2: Cross-tenant signing token exposure
-- ============================================================

DROP POLICY IF EXISTS "Only admins can view signing tokens" ON public.signing_tokens;

CREATE POLICY "Tenant admins can view signing tokens"
  ON public.signing_tokens FOR SELECT
  TO authenticated
  USING (is_tenant_admin(tenant_id));

-- ============================================================
-- FIX 3: Overly broad {public} role on profiles
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());