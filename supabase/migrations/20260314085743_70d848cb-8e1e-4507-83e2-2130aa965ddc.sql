
-- Fix the overly permissive INSERT policy on document_audit_log
DROP POLICY IF EXISTS "Authenticated users can insert document audit logs" ON public.document_audit_log;

CREATE POLICY "Tenant members can insert document audit logs"
  ON public.document_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_member(tenant_id)
  );
