
-- ══════════════════════════════════════════════════
-- Training & Document Library + Assignment Engine
-- ══════════════════════════════════════════════════

-- Central document/training library
CREATE TABLE public.training_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'training',
  file_path text,
  version integer NOT NULL DEFAULT 1,
  previous_version_id uuid REFERENCES public.training_library(id),
  effective_date date,
  review_date date,
  expiry_date date,
  requires_acknowledgement boolean NOT NULL DEFAULT false,
  requires_completion boolean NOT NULL DEFAULT false,
  requires_quiz boolean NOT NULL DEFAULT false,
  counts_toward_readiness boolean NOT NULL DEFAULT false,
  target_roles text[] DEFAULT '{}',
  target_departments text[] DEFAULT '{}',
  target_locations text[] DEFAULT '{}',
  created_by text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_view_library" ON public.training_library
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "managers_manage_library" ON public.training_library
  FOR ALL TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id))
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

-- Document/training assignments
CREATE TABLE public.training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.training_library(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_by text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  status text NOT NULL DEFAULT 'assigned',
  viewed_at timestamptz,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  quiz_score integer,
  quiz_passed boolean,
  reminder_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

-- Employees see only their own assignments
CREATE POLICY "employees_view_own_assignments" ON public.training_assignments
  FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.is_tenant_manager_or_above(tenant_id)
  );

-- Employees can update their own (view/acknowledge/complete)
CREATE POLICY "employees_update_own_assignments" ON public.training_assignments
  FOR UPDATE TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.is_tenant_manager_or_above(tenant_id)
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR public.is_tenant_manager_or_above(tenant_id)
  );

-- Managers can insert assignments
CREATE POLICY "managers_insert_assignments" ON public.training_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

-- Managers can delete assignments
CREATE POLICY "managers_delete_assignments" ON public.training_assignments
  FOR DELETE TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id));

-- Quiz questions for training documents
CREATE TABLE public.training_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.training_library(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_option integer NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_members_view_quiz" ON public.training_quiz_questions
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "managers_manage_quiz" ON public.training_quiz_questions
  FOR ALL TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id))
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

-- Auto-assignment rules
CREATE TABLE public.training_auto_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.training_library(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  target_roles text[] DEFAULT '{}',
  target_departments text[] DEFAULT '{}',
  target_locations text[] DEFAULT '{}',
  apply_to_new_starters boolean NOT NULL DEFAULT true,
  due_days_after_start integer DEFAULT 7,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_auto_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_manage_auto_rules" ON public.training_auto_rules
  FOR ALL TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id))
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

-- Training audit log
CREATE TABLE public.training_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.training_library(id),
  assignment_id uuid REFERENCES public.training_assignments(id),
  employee_id uuid REFERENCES public.employees(id),
  action text NOT NULL,
  acting_user_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_view_training_audit" ON public.training_audit_log
  FOR SELECT TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "insert_training_audit" ON public.training_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id));
