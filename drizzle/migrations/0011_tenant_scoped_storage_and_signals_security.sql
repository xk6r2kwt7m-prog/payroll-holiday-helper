-- 1. Tenant-scoped storage access helpers ------------------------------------

CREATE OR REPLACE FUNCTION public.storage_path_tenant_allowed(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(string_to_array(_name, '/')) AS seg
    WHERE seg ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.is_tenant_manager_or_above(seg::uuid)
  )
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id::text = split_part(_name, '/', 1)
      AND public.is_tenant_manager_or_above(e.tenant_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_storage_object(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.storage_path_tenant_allowed(_name)
  OR EXISTS (
    SELECT 1 FROM public.employee_documents d
    WHERE (d.file_path = _name OR d.signed_scan_file_path = _name OR d.final_signed_pdf_url = _name)
      AND public.is_tenant_manager_or_above(d.tenant_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.compliance_documents c
    WHERE c.file_path = _name AND public.is_tenant_manager_or_above(c.tenant_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.payroll_imports p
    WHERE p.file_path = _name AND public.is_tenant_manager_or_above(p.tenant_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.evidence_files f
    WHERE f.file_path = _name AND public.is_tenant_manager_or_above(f.tenant_id)
  )
  -- Legacy files stored before tenant scoping existed carry no tenant marker.
  -- Keep them readable by company administrators only.
  OR (
    _name !~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    AND EXISTS (
      SELECT 1 FROM public.tenant_members m
      WHERE m.user_id = auth.uid() AND m.is_active = true AND m.role = 'company_admin'
    )
  )
$$;

-- 2. Replace global-admin storage policies with tenant-scoped ones -----------

DROP POLICY IF EXISTS "Admins can upload employee documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update employee documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete employee documents" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can view employee document files" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can upload employee document files" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update employee document files" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete employee document files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view payroll files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload payroll files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete payroll files" ON storage.objects;
DROP POLICY IF EXISTS "Tenant admins can manage evidence storage" ON storage.objects;

CREATE POLICY "Tenant managers read their own employee documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'employee-documents' AND public.can_read_storage_object(name));

CREATE POLICY "Tenant managers upload their own employee documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'employee-documents' AND public.storage_path_tenant_allowed(name));

CREATE POLICY "Tenant managers update their own employee documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'employee-documents' AND public.can_read_storage_object(name))
WITH CHECK (bucket_id = 'employee-documents' AND public.can_read_storage_object(name));

CREATE POLICY "Tenant managers delete their own employee documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'employee-documents' AND public.can_read_storage_object(name));

CREATE POLICY "Tenant managers read their own payroll files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payroll-files' AND public.can_read_storage_object(name));

CREATE POLICY "Tenant managers upload their own payroll files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payroll-files' AND public.storage_path_tenant_allowed(name));

CREATE POLICY "Tenant managers update their own payroll files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payroll-files' AND public.can_read_storage_object(name))
WITH CHECK (bucket_id = 'payroll-files' AND public.can_read_storage_object(name));

CREATE POLICY "Tenant managers delete their own payroll files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payroll-files' AND public.can_read_storage_object(name));

CREATE POLICY "Tenant managers read their own evidence files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence-files' AND public.can_read_storage_object(name));

CREATE POLICY "Tenant managers upload their own evidence files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'evidence-files' AND public.storage_path_tenant_allowed(name));

CREATE POLICY "Tenant admins update their own evidence files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'evidence-files' AND public.can_read_storage_object(name))
WITH CHECK (bucket_id = 'evidence-files' AND public.can_read_storage_object(name));

CREATE POLICY "Tenant admins delete their own evidence files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'evidence-files' AND public.can_read_storage_object(name));

-- 3. operational_signals: scope writes to the row's tenant -------------------

DROP POLICY IF EXISTS "Managers can insert operational signals" ON public.operational_signals;
DROP POLICY IF EXISTS "Managers can update operational signals" ON public.operational_signals;
DROP POLICY IF EXISTS "Managers can delete operational signals" ON public.operational_signals;

CREATE POLICY "Tenant managers can insert operational signals"
ON public.operational_signals FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant managers can update operational signals"
ON public.operational_signals FOR UPDATE TO authenticated
USING (public.is_tenant_manager_or_above(tenant_id))
WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant managers can delete operational signals"
ON public.operational_signals FOR DELETE TO authenticated
USING (public.is_tenant_manager_or_above(tenant_id));

-- 4. Remove the legacy, tenant-blind role helpers ----------------------------

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_manager_or_above();

-- 5. Do not expose internal/trigger functions through the API ---------------

REVOKE EXECUTE ON FUNCTION public.assign_incident_report_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_talent_user_link() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_payroll_entry_accrual_ledger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_payroll_period_approved_accrual_ledger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_talent_application_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_talent_conversation_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_talent_message_sender() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_talent_unlock_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_talent_credits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalise_talent_purchase(uuid, text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_accrual_ledger_for_entry(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_scheduled_employment_terms() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_talent_wallet(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_country_holiday_accrual(numeric, uuid) FROM anon, authenticated;

-- Signed-in flows keep these; anonymous callers never need them.
REVOKE EXECUTE ON FUNCTION public.apply_to_vacancy(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.link_user_to_employee(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_talent_messages_read(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purchase_talent_credits(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.respond_to_contact_request(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_departments(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unlock_talent_contact(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_supervisor_only() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_supervisor_or_above() FROM anon;