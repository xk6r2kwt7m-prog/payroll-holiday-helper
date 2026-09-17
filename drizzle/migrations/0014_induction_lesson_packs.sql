-- Role-based induction lessons on the web (Front of House, Kitchen, Managers).
-- Two new tables only. Nothing existing is altered, renamed or deleted.

CREATE TABLE IF NOT EXISTS public.induction_lesson_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lesson_key text NOT NULL,
  lesson_version text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  notes text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_name text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, lesson_key, lesson_version)
);

GRANT SELECT, INSERT, UPDATE ON public.induction_lesson_approvals TO authenticated;
GRANT ALL ON public.induction_lesson_approvals TO service_role;

ALTER TABLE public.induction_lesson_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read lesson approvals"
  ON public.induction_lesson_approvals FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Tenant managers manage lesson approvals"
  ON public.induction_lesson_approvals FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members
    WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin', 'manager')
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members
    WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin', 'manager')
  ));

CREATE INDEX IF NOT EXISTS idx_lesson_approvals_tenant
  ON public.induction_lesson_approvals (tenant_id, lesson_key);

CREATE TABLE IF NOT EXISTS public.induction_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pack_role text NOT NULL CHECK (pack_role IN ('foh', 'kitchen', 'manager')),
  lesson_key text NOT NULL,
  lesson_version text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  acknowledged_understood boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, employee_id, lesson_key, lesson_version)
);

GRANT SELECT, INSERT, UPDATE ON public.induction_lesson_progress TO authenticated;
GRANT ALL ON public.induction_lesson_progress TO service_role;

ALTER TABLE public.induction_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant managers read lesson progress"
  ON public.induction_lesson_progress FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members
    WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin', 'manager', 'supervisor')
  ));

CREATE POLICY "Staff read their own lesson progress"
  ON public.induction_lesson_progress FOR SELECT
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Staff record their own lesson progress"
  ON public.induction_lesson_progress FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    AND tenant_id IN (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff update their own lesson progress"
  ON public.induction_lesson_progress FOR UPDATE
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_lesson_progress_employee
  ON public.induction_lesson_progress (tenant_id, employee_id);