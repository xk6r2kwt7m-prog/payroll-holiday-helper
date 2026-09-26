-- PROPOSAL: deploy with matching frontend after staging checks. No historical scores rewritten.
BEGIN;
CREATE TABLE public.training_assessment_receipts (
  request_id uuid PRIMARY KEY, assignment_id uuid NOT NULL, user_id uuid NOT NULL,
  answers jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_assessment_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_assessment_receipts FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.staff_assessment_questions(_assignment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.training_assignments%ROWTYPE; d public.training_library%ROWTYPE; result jsonb;
BEGIN
  SELECT * INTO a FROM public.training_assignments WHERE id=_assignment_id;
  IF auth.uid() IS NULL OR NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.employees WHERE id=a.employee_id AND tenant_id=a.tenant_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'This assessment is not assigned to you' USING ERRCODE='42501'; END IF;
  SELECT * INTO d FROM public.training_library WHERE id=a.document_id AND (tenant_id=a.tenant_id OR tenant_id IS NULL);
  IF NOT FOUND OR d.status<>'published' OR NOT d.is_active OR a.status='cancelled' OR NOT d.requires_quiz THEN RAISE EXCEPTION 'Assessment is unavailable'; END IF;
  IF a.module_version IS DISTINCT FROM d.version THEN RAISE EXCEPTION 'Training version changed. Ask your manager to reassign the current version.'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',q.id,'question',q.question,'options',q.options,'display_order',q.display_order) ORDER BY q.display_order,q.id),'[]') INTO result
    FROM public.training_quiz_questions q WHERE q.document_id=d.id AND (q.tenant_id=a.tenant_id OR q.tenant_id IS NULL);
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.submit_staff_assessment(_assignment_id uuid,_request_id uuid,_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.training_assignments%ROWTYPE; d public.training_library%ROWTYPE;
  receipt public.training_assessment_receipts%ROWTYPE; total int; correct int; attempt int; mark int;
  passed boolean; complete boolean; result jsonb;
BEGIN
  IF auth.uid() IS NULL OR _request_id IS NULL OR jsonb_typeof(_answers) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Sign in and supply the assessment answers and request id'; END IF;
  SELECT * INTO a FROM public.training_assignments WHERE id=_assignment_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.employees WHERE id=a.employee_id AND tenant_id=a.tenant_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'This assessment is not assigned to you' USING ERRCODE='42501'; END IF;
  SELECT * INTO receipt FROM public.training_assessment_receipts WHERE request_id=_request_id;
  IF FOUND THEN
    IF receipt.user_id<>auth.uid() OR receipt.assignment_id<>a.id OR receipt.answers<>_answers THEN RAISE EXCEPTION 'Request id was already used for another submission'; END IF;
    RETURN receipt.result;
  END IF;
  SELECT * INTO d FROM public.training_library WHERE id=a.document_id AND (tenant_id=a.tenant_id OR tenant_id IS NULL) FOR SHARE;
  IF NOT FOUND OR d.status<>'published' OR NOT d.is_active OR NOT d.requires_quiz OR a.status='cancelled' THEN RAISE EXCEPTION 'Assessment is unavailable'; END IF;
  IF a.module_version IS DISTINCT FROM d.version THEN RAISE EXCEPTION 'Training version changed. Ask your manager to reassign the current version.'; END IF;
  IF a.quiz_passed THEN RAISE EXCEPTION 'This assessment has already been passed'; END IF;
  SELECT count(*)+1 INTO attempt FROM public.training_quiz_attempts WHERE assignment_id=a.id;
  IF attempt>coalesce(d.retry_limit,3) THEN RAISE EXCEPTION 'No attempts remain. Contact your manager for coaching.'; END IF;
  -- Lock question rows for a consistent grading snapshot.
  PERFORM id FROM public.training_quiz_questions WHERE document_id=d.id ORDER BY id FOR SHARE;
  SELECT count(*),count(*) FILTER(WHERE _answers->>q.id::text=q.correct_option::text) INTO total,correct
    FROM public.training_quiz_questions q WHERE q.document_id=d.id AND (q.tenant_id=a.tenant_id OR q.tenant_id IS NULL);
  IF total=0 OR (SELECT count(*) FROM jsonb_object_keys(_answers))<>total THEN RAISE EXCEPTION 'Answer every question before submitting'; END IF;
  IF EXISTS(SELECT 1 FROM public.training_quiz_questions q WHERE q.document_id=d.id AND (q.tenant_id=a.tenant_id OR q.tenant_id IS NULL)
    AND (NOT (_answers ? q.id::text) OR jsonb_typeof(_answers->q.id::text) IS DISTINCT FROM 'number'
      OR (_answers->>q.id::text) !~ '^[0-9]+$'
      OR (_answers->>q.id::text)::numeric>=jsonb_array_length(q.options))) THEN RAISE EXCEPTION 'An answer is missing or invalid'; END IF;
  mark:=round(correct*100.0/total); passed:=mark>=coalesce(d.pass_mark,80);
  complete:=passed AND (NOT coalesce(a.signoff_required,false) OR a.signed_off_at IS NOT NULL)
    AND (NOT d.requires_acknowledgement OR a.acknowledged_at IS NOT NULL);
  INSERT INTO public.training_quiz_attempts(tenant_id,assignment_id,employee_id,document_id,score,passed,attempt_number,answers_json)
    VALUES(a.tenant_id,a.id,a.employee_id,d.id,mark,passed,attempt,_answers);
  UPDATE public.training_assignments SET quiz_score=mark,score=mark,quiz_passed=passed,
    status=CASE WHEN complete THEN 'completed' ELSE 'viewed' END,
    viewed_at=coalesce(viewed_at,clock_timestamp()),completed_at=CASE WHEN complete THEN clock_timestamp() ELSE NULL END
    WHERE id=a.id;
  INSERT INTO public.training_audit_log(tenant_id,document_id,assignment_id,employee_id,action,acting_user_id,metadata)
    VALUES(a.tenant_id,d.id,a.id,a.employee_id,CASE WHEN passed THEN 'quiz_passed' ELSE 'quiz_failed' END,auth.uid()::text,
      jsonb_build_object('score',mark,'passed',passed,'attempt_number',attempt,'graded_on_server',true));
  result:=jsonb_build_object('score',mark,'passed',passed,'attempt_number',attempt,'correct',correct,'total',total,'pass_mark',coalesce(d.pass_mark,80),'attempts_remaining',greatest(0,coalesce(d.retry_limit,3)-attempt),'completed',complete);
  INSERT INTO public.training_assessment_receipts(request_id,assignment_id,user_id,answers,result) VALUES(_request_id,a.id,auth.uid(),_answers,result);
  RETURN result;
END $$;

-- RLS policies are permissive/additive: remove all old SELECT/ALL question policies,
-- then allow authors only. Staff access is through the answer-free RPC above.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='training_quiz_questions' AND cmd IN ('SELECT','ALL') LOOP
    EXECUTE format('DROP POLICY %I ON public.training_quiz_questions',p.policyname);
  END LOOP;
END $$;
CREATE POLICY assessment_authors_read ON public.training_quiz_questions FOR SELECT TO authenticated
  USING(public.is_tenant_manager_or_above(tenant_id));
CREATE POLICY assessment_authors_insert ON public.training_quiz_questions FOR INSERT TO authenticated
  WITH CHECK(public.is_tenant_manager_or_above(tenant_id));
CREATE POLICY assessment_authors_update ON public.training_quiz_questions FOR UPDATE TO authenticated
  USING(public.is_tenant_manager_or_above(tenant_id)) WITH CHECK(public.is_tenant_manager_or_above(tenant_id));
CREATE POLICY assessment_authors_delete ON public.training_quiz_questions FOR DELETE TO authenticated
  USING(public.is_tenant_manager_or_above(tenant_id));
REVOKE INSERT,UPDATE,DELETE ON public.training_quiz_attempts FROM PUBLIC,anon,authenticated;
ALTER TABLE public.training_quiz_attempts ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='training_quiz_attempts' AND cmd IN ('SELECT','ALL') LOOP
    EXECUTE format('DROP POLICY %I ON public.training_quiz_attempts',p.policyname);
  END LOOP;
END $$;
CREATE POLICY assessment_history_owner_or_manager ON public.training_quiz_attempts FOR SELECT TO authenticated
  USING(public.is_tenant_manager_or_above(tenant_id) OR EXISTS(
    SELECT 1 FROM public.employees e WHERE e.id=training_quiz_attempts.employee_id AND e.tenant_id=training_quiz_attempts.tenant_id AND e.user_id=auth.uid()));

-- Ordinary client updates cannot manufacture server grading or staff sign-off.
CREATE OR REPLACE FUNCTION public.protect_training_evidence()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF NEW.quiz_score IS DISTINCT FROM OLD.quiz_score OR NEW.quiz_passed IS DISTINCT FROM OLD.quiz_passed OR NEW.score IS DISTINCT FROM OLD.score THEN RAISE EXCEPTION 'Assessment results must be recorded by the grading service'; END IF;
    IF NOT public.is_tenant_manager_or_above(OLD.tenant_id) AND (
      NEW.signed_off_at IS DISTINCT FROM OLD.signed_off_at OR NEW.signed_off_by IS DISTINCT FROM OLD.signed_off_by
      OR NEW.signoff_required IS DISTINCT FROM OLD.signoff_required OR NEW.signoff_status IS DISTINCT FROM OLD.signoff_status
      OR NEW.employee_id IS DISTINCT FROM OLD.employee_id OR NEW.document_id IS DISTINCT FROM OLD.document_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.module_version IS DISTINCT FROM OLD.module_version) THEN RAISE EXCEPTION 'Only a manager may change assignment or sign-off requirements'; END IF;
    IF NEW.status='completed' AND (NEW.signoff_required AND NEW.signed_off_at IS NULL OR EXISTS(
      SELECT 1 FROM public.training_library d WHERE d.id=NEW.document_id AND (d.requires_quiz AND NEW.quiz_passed IS DISTINCT FROM true OR d.requires_acknowledgement AND NEW.acknowledged_at IS NULL))) THEN RAISE EXCEPTION 'Training requirements remain outstanding'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_training_evidence BEFORE UPDATE ON public.training_assignments FOR EACH ROW EXECUTE FUNCTION public.protect_training_evidence();
REVOKE ALL ON FUNCTION public.staff_assessment_questions(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.submit_staff_assessment(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_assessment_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_staff_assessment(uuid,uuid,jsonb) TO authenticated;
COMMIT;
