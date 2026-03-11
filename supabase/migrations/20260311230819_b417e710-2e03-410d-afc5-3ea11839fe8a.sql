
-- Fix overly permissive audit log insert policy
DROP POLICY "System can insert talent audit log" ON public.talent_audit_log;

CREATE POLICY "Authenticated users can insert talent audit log"
  ON public.talent_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IS NOT NULL AND (
      is_tenant_admin(tenant_id)
      OR EXISTS (
        SELECT 1 FROM public.talent_profiles tp
        JOIN public.employees e ON e.id = tp.employee_id
        WHERE tp.id = talent_audit_log.talent_profile_id
          AND e.user_id = auth.uid()
      )
    )
  );
