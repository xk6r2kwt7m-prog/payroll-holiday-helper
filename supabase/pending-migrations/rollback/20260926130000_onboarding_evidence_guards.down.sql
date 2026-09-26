-- RECOVERY ONLY. Reverses 20260926130000_onboarding_evidence_guards.sql.
-- Keeps rtw_decision_receipts and every decision/audit row already recorded (evidence is never deleted).
BEGIN;
DROP TRIGGER IF EXISTS protect_published_assessment_rules ON public.training_library;
DROP FUNCTION IF EXISTS public.protect_published_assessment_rules();
DROP TRIGGER IF EXISTS protect_published_quiz_questions ON public.training_quiz_questions;
DROP FUNCTION IF EXISTS public.protect_published_quiz_questions();
DROP TRIGGER IF EXISTS protect_rtw_review_evidence ON public.employee_onboarding_data;
DROP FUNCTION IF EXISTS public.protect_rtw_review_evidence();
DROP FUNCTION IF EXISTS public.record_rtw_decision_atomic(uuid,uuid,text,text,text,date,timestamptz);
COMMENT ON TABLE public.rtw_decision_receipts IS 'RETIRED: retry receipts kept as evidence after rollback of 20260926130000';
COMMIT;
