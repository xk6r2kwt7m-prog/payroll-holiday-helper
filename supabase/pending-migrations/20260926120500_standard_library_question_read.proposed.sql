-- PROPOSED AMENDMENT to 20260926120000 (found in isolated testing, 26 Sep 2026).
-- Without it, managers can no longer read standard-library (tenant_id IS NULL) questions, so
-- "adopt standard module" silently copies a module with zero questions. Staff still cannot read answers.
BEGIN;
CREATE POLICY assessment_authors_read_standard ON public.training_quiz_questions FOR SELECT TO authenticated
  USING (tenant_id IS NULL AND EXISTS (SELECT 1 FROM public.tenant_members m
    WHERE m.user_id = auth.uid() AND m.is_active AND m.role::text IN ('company_admin','manager')));
COMMIT;
