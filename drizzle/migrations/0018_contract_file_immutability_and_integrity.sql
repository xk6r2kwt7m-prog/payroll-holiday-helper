-- Priority 1: protect signed contract files at storage level, record recovery copies
-- and dated integrity checks. Additive only.

CREATE OR REPLACE FUNCTION public.is_locked_contract_object(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _name LIKE 'contracts/final/%'
     OR EXISTS (
       SELECT 1 FROM public.employee_documents d
       WHERE d.contract_state IN ('signed', 'superseded', 'terminated')
         AND _name IN (d.file_path, d.final_signed_pdf_url, d.signed_scan_file_path)
     );
$$;

REVOKE ALL ON FUNCTION public.is_locked_contract_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_locked_contract_object(text) TO authenticated, service_role;

-- Recovery copies of completed contract files. Never replaces the original.
CREATE TABLE public.contract_file_recoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_document_id uuid NOT NULL REFERENCES public.employee_documents(id) ON DELETE CASCADE,
  original_file_path text,
  original_file_hash text,
  recovery_file_path text NOT NULL,
  recovery_file_hash text NOT NULL,
  reason text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contract_file_recoveries TO authenticated;
GRANT ALL ON public.contract_file_recoveries TO service_role;
ALTER TABLE public.contract_file_recoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins read contract file recoveries"
ON public.contract_file_recoveries FOR SELECT TO authenticated
USING (public.is_tenant_admin(tenant_id));

CREATE INDEX idx_contract_file_recoveries_doc ON public.contract_file_recoveries(employee_document_id, created_at DESC);

-- Dated integrity checks. Confirms the file as at the moment of checking only.
CREATE TABLE public.contract_integrity_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_document_id uuid NOT NULL REFERENCES public.employee_documents(id) ON DELETE CASCADE,
  file_kind text NOT NULL,
  file_path text,
  stored_hash text,
  recalculated_hash text,
  result text NOT NULL,
  detail text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.contract_integrity_checks TO authenticated;
GRANT ALL ON public.contract_integrity_checks TO service_role;
ALTER TABLE public.contract_integrity_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins read contract integrity checks"
ON public.contract_integrity_checks FOR SELECT TO authenticated
USING (public.is_tenant_admin(tenant_id));

CREATE INDEX idx_contract_integrity_checks_doc ON public.contract_integrity_checks(employee_document_id, checked_at DESC);

-- Storage: locked contract files can no longer be updated or deleted by anyone.
DROP POLICY IF EXISTS "Tenant managers update their own employee documents" ON storage.objects;
CREATE POLICY "Tenant managers update their own employee documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND public.can_read_storage_object(name)
  AND NOT public.is_locked_contract_object(name)
)
WITH CHECK (
  bucket_id = 'employee-documents'
  AND public.can_read_storage_object(name)
  AND NOT public.is_locked_contract_object(name)
);

DROP POLICY IF EXISTS "Tenant managers delete their own employee documents" ON storage.objects;
CREATE POLICY "Tenant managers delete their own employee documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND public.can_read_storage_object(name)
  AND NOT public.is_locked_contract_object(name)
);