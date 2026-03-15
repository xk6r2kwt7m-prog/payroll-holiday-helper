
-- training_auto_rules already exists, just ensure RLS and policies are set
ALTER TABLE public.training_auto_rules ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist and recreate (safe idempotent approach)
DROP POLICY IF EXISTS "Tenant members can read auto rules" ON public.training_auto_rules;
DROP POLICY IF EXISTS "Managers can insert auto rules" ON public.training_auto_rules;
DROP POLICY IF EXISTS "Managers can update auto rules" ON public.training_auto_rules;
DROP POLICY IF EXISTS "Managers can delete auto rules" ON public.training_auto_rules;

CREATE POLICY "Tenant members can read auto rules"
  ON public.training_auto_rules FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Managers can insert auto rules"
  ON public.training_auto_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Managers can update auto rules"
  ON public.training_auto_rules FOR UPDATE TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Managers can delete auto rules"
  ON public.training_auto_rules FOR DELETE TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id));

-- Create training_quiz_attempts table
CREATE TABLE IF NOT EXISTS public.training_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  document_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  attempt_number integer NOT NULL DEFAULT 1,
  answers_json jsonb,
  started_at timestamptz,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read quiz attempts" ON public.training_quiz_attempts;
DROP POLICY IF EXISTS "Authenticated users can insert quiz attempts" ON public.training_quiz_attempts;

CREATE POLICY "Tenant members can read quiz attempts"
  ON public.training_quiz_attempts FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Authenticated users can insert quiz attempts"
  ON public.training_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id));

-- Add assignment_source column to training_assignments
ALTER TABLE public.training_assignments
  ADD COLUMN IF NOT EXISTS assignment_source text NOT NULL DEFAULT 'direct';
