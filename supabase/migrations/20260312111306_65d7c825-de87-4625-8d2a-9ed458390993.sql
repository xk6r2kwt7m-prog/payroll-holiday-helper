DROP POLICY IF EXISTS "Authenticated users can insert talent audit log" ON public.talent_audit_log;

CREATE POLICY "Authenticated users can insert talent audit log"
ON public.talent_audit_log FOR INSERT
TO authenticated
WITH CHECK (
  (tenant_id IS NOT NULL)
  AND (
    is_tenant_admin(tenant_id)
    OR (
      EXISTS (
        SELECT 1
        FROM talent_profiles tp
        JOIN employees e ON e.id = tp.employee_id
        WHERE tp.id = talent_audit_log.talent_profile_id
          AND e.user_id = auth.uid()
          AND tp.tenant_id = talent_audit_log.tenant_id
      )
    )
  )
);