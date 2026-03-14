
-- 1. Add 'onboarding' to employee_status enum
ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'onboarding';

-- 2. Add document_status and verification columns to employee_documents
ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS document_status text NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verification_date timestamptz,
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS rejected_reason text;

-- 3. Create document_audit_log table
CREATE TABLE IF NOT EXISTS public.document_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.employee_documents(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  performed_by uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: admins/managers can see all audit logs for their tenant
CREATE POLICY "Tenant admins can view document audit logs"
  ON public.document_audit_log FOR SELECT TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id));

-- RLS: staff can see their own audit logs
CREATE POLICY "Staff can view own document audit logs"
  ON public.document_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = document_audit_log.employee_id
        AND e.user_id = auth.uid()
    )
  );

-- RLS: insert for authenticated (system writes)
CREATE POLICY "Authenticated users can insert document audit logs"
  ON public.document_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE allowed (immutable audit log)

-- 4. Create employee_onboarding_data table for self-service submissions
CREATE TABLE IF NOT EXISTS public.employee_onboarding_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  personal_info jsonb DEFAULT '{}'::jsonb,
  bank_details jsonb DEFAULT '{}'::jsonb,
  emergency_contact jsonb DEFAULT '{}'::jsonb,
  onboarding_completed_at timestamptz,
  submitted_at timestamptz,
  step_completed int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_onboarding_data ENABLE ROW LEVEL SECURITY;

-- RLS: employee can read/update their own onboarding data
CREATE POLICY "Employee can view own onboarding data"
  ON public.employee_onboarding_data FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_onboarding_data.employee_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Employee can update own onboarding data"
  ON public.employee_onboarding_data FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_onboarding_data.employee_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Employee can insert own onboarding data"
  ON public.employee_onboarding_data FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_onboarding_data.employee_id
        AND e.user_id = auth.uid()
    )
  );

-- Admin can view/manage all onboarding data in their tenant
CREATE POLICY "Admins can manage onboarding data"
  ON public.employee_onboarding_data FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

-- 5. Add email column to employees if not exists
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email text;

-- 6. Add onboarding_token to employees for secure link access
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS onboarding_token uuid DEFAULT gen_random_uuid();
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS onboarding_token_expires_at timestamptz;

-- Trigger for updated_at on employee_onboarding_data
CREATE TRIGGER update_employee_onboarding_data_updated_at
  BEFORE UPDATE ON public.employee_onboarding_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
