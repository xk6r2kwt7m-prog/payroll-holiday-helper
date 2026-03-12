
-- FIX 1: Replace staff ALL policy on evidence_files with separate SELECT + INSERT only
-- This prevents staff from self-approving their own evidence by modifying review fields
DROP POLICY IF EXISTS "Staff can manage own evidence files" ON public.evidence_files;

CREATE POLICY "Staff can view own evidence files"
ON public.evidence_files FOR SELECT
TO authenticated
USING (
  is_tenant_member(tenant_id) 
  AND employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Staff can upload own evidence files"
ON public.evidence_files FOR INSERT
TO authenticated
WITH CHECK (
  is_tenant_member(tenant_id) 
  AND employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- FIX 2: Replace staff INSERT policy on time_entries to also validate tenant_id
-- This prevents staff from injecting time entries into other tenants
DROP POLICY IF EXISTS "Staff can insert own time entries" ON public.time_entries;

CREATE POLICY "Staff can insert own time entries"
ON public.time_entries FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
  AND tenant_id = (
    SELECT e.tenant_id FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid()
  )
);

-- FIX 3: Create a safe view for supervisors that excludes PII/financial columns
-- Then replace the supervisor SELECT policy to use a function that restricts columns
-- Since views require application-level changes, we'll restrict the supervisor policy
-- to only work via a security definer function that checks role level

-- Create a function to check if user is supervisor (not admin/manager)
CREATE OR REPLACE FUNCTION public.is_supervisor_only()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'supervisor'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
  )
$$;
