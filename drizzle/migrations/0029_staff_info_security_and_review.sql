-- ---------------------------------------------------------------------------
-- Secure staff-information collection, version 1
-- Additive only. No columns or tables are removed and no data is rewritten.
-- ---------------------------------------------------------------------------

-- 1. "On file" flags so screens can tell whether something is held without
--    ever reading the value itself.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS has_ni_number boolean
    GENERATED ALWAYS AS (ni_number IS NOT NULL AND btrim(ni_number) <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_bank_details boolean
    GENERATED ALWAYS AS (
      bank_account_no IS NOT NULL AND btrim(bank_account_no) <> ''
      AND sort_code IS NOT NULL AND btrim(sort_code) <> ''
    ) STORED,
  ADD COLUMN IF NOT EXISTS has_passport boolean
    GENERATED ALWAYS AS (passport_no IS NOT NULL AND btrim(passport_no) <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_share_code boolean
    GENERATED ALWAYS AS (sharing_code IS NOT NULL AND btrim(sharing_code) <> '') STORED;

-- 2. Branch scope helpers (security definer, so they do not re-enter RLS).
CREATE OR REPLACE FUNCTION public.my_branches(_tenant_id uuid)
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT mb.branch
  FROM employee_branches mb
  JOIN employees me ON me.id = mb.employee_id
  WHERE me.user_id = auth.uid() AND me.tenant_id = _tenant_id;
$$;

-- A user with no branch assignment keeps their present, tenant-wide view, so
-- nobody loses access unexpectedly. Assigning branches is what narrows it.
CREATE OR REPLACE FUNCTION public.has_branch_scope(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.my_branches(_tenant_id));
$$;

CREATE OR REPLACE FUNCTION public.can_view_employee(_employee_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.id = _employee_id
      AND (
        public.is_tenant_admin(e.tenant_id)
        OR e.user_id = auth.uid()
        OR (
          public.is_tenant_member(e.tenant_id)
          AND (
            NOT public.has_branch_scope(e.tenant_id)
            OR EXISTS (
              SELECT 1 FROM employee_branches eb
              WHERE eb.employee_id = e.id
                AND eb.branch IN (SELECT public.my_branches(e.tenant_id))
            )
          )
        )
      )
  );
$$;

-- 3. Staff records: administrators see everyone; anyone else sees only the
--    people at their own branches.
DROP POLICY IF EXISTS "Tenant supervisors can view employees" ON public.employees;

CREATE POLICY "Branch scoped employee reads"
ON public.employees FOR SELECT TO authenticated
USING (
  public.is_tenant_admin(tenant_id)
  OR user_id = auth.uid()
  OR (
    public.is_tenant_supervisor_or_above(tenant_id)
    AND (
      NOT public.has_branch_scope(tenant_id)
      OR id IN (
        SELECT eb.employee_id FROM employee_branches eb
        WHERE eb.tenant_id = employees.tenant_id
          AND eb.branch IN (SELECT public.my_branches(employees.tenant_id))
      )
    )
  )
);

-- 4. Bank details, National Insurance numbers and identity document numbers
--    are administrator-only, enforced by the database.
REVOKE SELECT (ni_number, bank_account_no, sort_code, passport_no, sharing_code, residence_permit)
  ON public.employees FROM authenticated;

CREATE OR REPLACE FUNCTION public.employee_sensitive_fields(_employee_id uuid)
RETURNS TABLE (
  employee_id uuid,
  ni_number text,
  bank_account_no text,
  sort_code text,
  passport_no text,
  sharing_code text,
  residence_permit text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id, e.ni_number, e.bank_account_no, e.sort_code,
         e.passport_no, e.sharing_code, e.residence_permit
  FROM employees e
  WHERE e.id = _employee_id
    AND public.is_tenant_admin(e.tenant_id);
$$;

CREATE OR REPLACE FUNCTION public.tenant_sensitive_fields(_tenant_id uuid)
RETURNS TABLE (
  employee_id uuid,
  ni_number text,
  bank_account_no text,
  sort_code text,
  passport_no text,
  sharing_code text,
  residence_permit text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id, e.ni_number, e.bank_account_no, e.sort_code,
         e.passport_no, e.sharing_code, e.residence_permit
  FROM employees e
  WHERE e.tenant_id = _tenant_id
    AND public.is_tenant_admin(_tenant_id);
$$;

REVOKE ALL ON FUNCTION public.employee_sensitive_fields(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tenant_sensitive_fields(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.employee_sensitive_fields(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_sensitive_fields(uuid) TO authenticated, service_role;

-- 5. Documents, requests and submitted details follow the same branch scope.
DROP POLICY IF EXISTS "Tenant members read info requests" ON public.employee_info_requests;
CREATE POLICY "Branch scoped info request reads"
ON public.employee_info_requests FOR SELECT TO authenticated
USING (public.is_tenant_admin(tenant_id) OR public.can_view_employee(employee_id));

CREATE POLICY "Branch scoped submitted detail reads"
ON public.employee_onboarding_data FOR SELECT TO authenticated
USING (public.is_tenant_admin(tenant_id) OR public.can_view_employee(employee_id));

-- 6. The document access log is written by the system, not by users.
DROP POLICY IF EXISTS "Tenant members can insert document audit logs" ON public.document_audit_log;
CREATE POLICY "Managers record document access"
ON public.document_audit_log FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_manager_or_above(tenant_id) AND performed_by = auth.uid());

-- 7. Submitted changes awaiting review.
CREATE TABLE IF NOT EXISTS public.staff_detail_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  request_id uuid,
  section text NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  old_value text,
  new_value text,
  sensitive boolean NOT NULL DEFAULT false,
  needs_review boolean NOT NULL DEFAULT true,
  state text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_by_name text,
  decided_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.staff_detail_changes TO authenticated;
GRANT ALL ON public.staff_detail_changes TO service_role;
ALTER TABLE public.staff_detail_changes ENABLE ROW LEVEL SECURITY;

-- Anything sensitive is administrator-only; the rest follows branch scope.
CREATE POLICY "Read submitted changes in scope"
ON public.staff_detail_changes FOR SELECT TO authenticated
USING (
  public.is_tenant_admin(tenant_id)
  OR (sensitive = false AND public.can_view_employee(employee_id))
);

CREATE POLICY "Managers record submitted changes"
ON public.staff_detail_changes FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Admins decide submitted changes"
ON public.staff_detail_changes FOR UPDATE TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE INDEX IF NOT EXISTS staff_detail_changes_employee_idx
  ON public.staff_detail_changes (employee_id, state);

-- 8. A bank change is only live once an administrator confirms it directly
--    with the employee.
CREATE TABLE IF NOT EXISTS public.bank_detail_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  change_id uuid,
  verified_by uuid,
  verified_by_name text NOT NULL,
  confirmed_directly boolean NOT NULL DEFAULT true,
  notes text,
  verified_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.bank_detail_verifications TO authenticated;
GRANT ALL ON public.bank_detail_verifications TO service_role;
ALTER TABLE public.bank_detail_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read bank verifications"
ON public.bank_detail_verifications FOR SELECT TO authenticated
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Admins record bank verifications"
ON public.bank_detail_verifications FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_admin(tenant_id) AND verified_by = auth.uid());

-- 9. Right-to-work review state, alongside the values already stored.
ALTER TABLE public.employee_onboarding_data
  ADD COLUMN IF NOT EXISTS rtw_reviewed_by_name text,
  ADD COLUMN IF NOT EXISTS rtw_expires_on date;

-- 10. Request-level review trail.
ALTER TABLE public.employee_info_requests
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by_name text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_decision text,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_document_id uuid,
  ADD COLUMN IF NOT EXISTS last_saved_at timestamptz;