-- RECOVERY ONLY. Reverses 20260926120000_server_training_assessments.sql, restoring the exact live policies/grants of 26 Sep 2026.
-- Keeps training_assessment_receipts and all attempts/audit rows already recorded.
BEGIN;
DROP TRIGGER IF EXISTS protect_training_evidence ON public.training_assignments;
DROP FUNCTION IF EXISTS public.protect_training_evidence();
DROP FUNCTION IF EXISTS public.submit_staff_assessment(uuid,uuid,jsonb);
DROP FUNCTION IF EXISTS public.staff_assessment_questions(uuid);
DROP POLICY IF EXISTS assessment_authors_read ON public.training_quiz_questions;
DROP POLICY IF EXISTS assessment_authors_read_standard ON public.training_quiz_questions;
DROP POLICY IF EXISTS assessment_authors_insert ON public.training_quiz_questions;
DROP POLICY IF EXISTS assessment_authors_update ON public.training_quiz_questions;
DROP POLICY IF EXISTS assessment_authors_delete ON public.training_quiz_questions;
CREATE POLICY managers_manage_quiz ON public.training_quiz_questions FOR ALL TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id)) WITH CHECK (public.is_tenant_manager_or_above(tenant_id));
CREATE POLICY select_quiz_questions_v2 ON public.training_quiz_questions FOR SELECT TO authenticated
  USING ((tenant_id IS NULL) OR public.is_tenant_member(tenant_id));
CREATE POLICY tenant_members_view_quiz ON public.training_quiz_questions FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));
DROP POLICY IF EXISTS assessment_history_owner_or_manager ON public.training_quiz_attempts;
CREATE POLICY "Tenant members can read quiz attempts" ON public.training_quiz_attempts FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_quiz_attempts TO anon, authenticated;
COMMENT ON TABLE public.training_assessment_receipts IS 'RETIRED: retry receipts kept as evidence after rollback of 20260926120000';
COMMIT;
