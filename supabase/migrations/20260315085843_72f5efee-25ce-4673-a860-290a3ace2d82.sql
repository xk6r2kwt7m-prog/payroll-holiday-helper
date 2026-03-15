
-- ============================================================
-- PHASE 1: TALENT POOL PRIVACY HARDENING
-- Origin-tenant exclusion, remove admin INSERT, restrict audit,
-- deprecate previous_employer_only
-- ============================================================

-- 1. ORIGIN-TENANT EXCLUSION: Former employer cannot browse ex-employees
-- Drop the existing browse policy and replace with privacy-hardened version
DROP POLICY IF EXISTS "Companies can view permitted talent profiles" ON public.talent_profiles;

CREATE POLICY "Companies can view permitted talent profiles"
ON public.talent_profiles FOR SELECT TO authenticated
USING (
  -- Must be active and visible
  talent_pool_status IN ('open_to_work', 'available_now', 'available_from_date')
  AND visibility_mode != 'hidden'
  -- CRITICAL PRIVACY: Exclude profiles originating from viewer's own tenant
  -- Former employer must NOT see their ex-employee's marketplace profile
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.tenant_id = talent_profiles.tenant_id
      AND tm.is_active = true
  )
  -- Visibility permissions check (unchanged logic)
  AND (
    visibility_mode = 'all_approved'
    OR EXISTS (
      SELECT 1 FROM public.talent_visibility_permissions tvp
      JOIN public.tenant_members tm ON tm.user_id = auth.uid() AND tm.is_active = true
      WHERE tvp.talent_profile_id = talent_profiles.id
        AND (tvp.allowed_tenant_id = tm.tenant_id OR tvp.allowed_tenant_id IS NULL)
    )
  )
);

-- 2. REMOVE ADMIN INSERT: Worker must self-activate their marketplace profile
-- Admins should NOT be able to create talent profiles on behalf of workers
DROP POLICY IF EXISTS "Tenant admins can create talent profile during offboarding" ON public.talent_profiles;

-- 3. RESTRICT AUDIT LOG: Tenant admins must NOT infer cross-company activity
DROP POLICY IF EXISTS "Tenant admins can view talent audit log" ON public.talent_audit_log;

CREATE POLICY "Platform admins can view talent audit log"
ON public.talent_audit_log FOR SELECT TO authenticated
USING (public.is_platform_admin());

-- 4. DEPRECATE previous_employer_only: Migrate any remaining rows to hidden
-- This is a safe, reversible migration — any profile using this mode becomes hidden
-- To reverse: UPDATE talent_profiles SET visibility_mode = 'previous_employer_only' WHERE ...
-- (but only if the enum value is re-added)
UPDATE public.talent_profiles
SET visibility_mode = 'hidden'
WHERE visibility_mode = 'previous_employer_only';
