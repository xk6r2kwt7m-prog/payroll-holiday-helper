
-- =============================================================
-- Phase 1: Privacy hardening for Talent Pool module
-- =============================================================

-- 1. talent_profiles: Remove tenant admin ALL access
--    Former employer must NOT read, edit, or delete ex-employee marketplace profiles
DROP POLICY IF EXISTS "Tenant admins can manage own talent profiles" ON public.talent_profiles;

-- 1b. Replace with INSERT-only for tenant admins (leaver flow creates initial profile)
CREATE POLICY "Tenant admins can create talent profile during offboarding"
  ON public.talent_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_tenant_admin(tenant_id));

-- 2. talent_visibility_permissions: Remove tenant admin override
--    Only the employee should control who can see their profile
DROP POLICY IF EXISTS "Profile owner can manage visibility" ON public.talent_visibility_permissions;

CREATE POLICY "Employee controls own visibility permissions"
  ON public.talent_visibility_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM talent_profiles tp
      JOIN employees e ON e.id = tp.employee_id
      WHERE tp.id = talent_visibility_permissions.talent_profile_id
        AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM talent_profiles tp
      JOIN employees e ON e.id = tp.employee_id
      WHERE tp.id = talent_visibility_permissions.talent_profile_id
        AND e.user_id = auth.uid()
    )
  );

-- 3. talent_audit_log: Restrict SELECT so originating admin
--    only sees their own tenant's audit entries (not cross-company activity)
--    Keep as-is since it already filters by tenant_id and is_tenant_admin(tenant_id)
--    The edge function writes with the ACTING tenant_id, which is correct.

-- 4. talent_interest_actions: Verify the policy is correct
--    The current policy uses is_tenant_admin(tenant_id) which references
--    the ACTING company's tenant_id. This is correct — Company B sees
--    their own interest actions, not Company A's.
--    No change needed.
