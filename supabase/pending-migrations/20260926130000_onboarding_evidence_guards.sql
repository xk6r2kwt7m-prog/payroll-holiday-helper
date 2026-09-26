-- Proposed only. Requires the two atomic onboarding migrations from PR #12.
BEGIN;
CREATE TABLE public.rtw_decision_receipts (
 request_id uuid PRIMARY KEY, user_id uuid NOT NULL, tenant_id uuid NOT NULL,
 payload jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rtw_decision_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rtw_decision_receipts FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_rtw_decision_atomic(
 _employee_id uuid, _request_id uuid, _decision text, _reviewer text,
 _notes text, _expires_on date, _expected_updated_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 e public.employees%ROWTYPE; o public.employee_onboarding_data%ROWTYPE;
 receipt public.rtw_decision_receipts%ROWTYPE; payload jsonb; result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in before recording a check'; END IF;
 IF _request_id IS NULL OR _expected_updated_at IS NULL OR _decision IS NULL
    OR _decision NOT IN ('verified','rejected','expired')
    OR nullif(btrim(_reviewer),'') IS NULL OR nullif(btrim(_notes),'') IS NULL THEN
   RAISE EXCEPTION 'A review, evidence notes, decision and request id are required'; END IF;
 SELECT * INTO e FROM public.employees WHERE id=_employee_id FOR UPDATE;
 IF NOT FOUND OR public.staff_review_role(e.tenant_id) IS NULL THEN RAISE EXCEPTION 'Workspace manager access required'; END IF;
 payload := jsonb_build_object('employee',_employee_id,'decision',_decision,'reviewer',btrim(_reviewer),
   'notes',btrim(_notes),'expires',_expires_on,'revision',_expected_updated_at);
 SELECT * INTO receipt FROM public.rtw_decision_receipts WHERE request_id=_request_id;
 IF FOUND THEN
   IF receipt.user_id<>auth.uid() OR receipt.tenant_id<>e.tenant_id OR receipt.payload<>payload THEN
     RAISE EXCEPTION 'Request id already used for a different review'; END IF;
   RETURN receipt.result;
 END IF;
 SELECT * INTO o FROM public.employee_onboarding_data WHERE employee_id=e.id FOR UPDATE;
 IF NOT FOUND OR o.tenant_id IS DISTINCT FROM e.tenant_id THEN RAISE EXCEPTION 'No matching evidence record to review'; END IF;
 IF o.updated_at IS DISTINCT FROM _expected_updated_at THEN RAISE EXCEPTION 'Evidence changed. Reload and review it before saving'; END IF;
 IF _decision='verified' AND _expires_on < (clock_timestamp() AT TIME ZONE 'Europe/London')::date THEN
   RAISE EXCEPTION 'Expired permission cannot be marked verified'; END IF;
 UPDATE public.employee_onboarding_data SET rtw_status=_decision,
   rtw_reviewed_at=clock_timestamp(),rtw_reviewed_by=auth.uid(),rtw_reviewed_by_name=btrim(_reviewer),
   rtw_review_notes=btrim(_notes),rtw_expires_on=_expires_on,updated_at=clock_timestamp()
 WHERE id=o.id;
 INSERT INTO public.audit_log(tenant_id,user_id,action,table_name,record_id,new_data)
 VALUES(e.tenant_id,auth.uid(),'update','right_to_work_review',e.id,
   jsonb_build_object('decision',_decision,'request_id',_request_id,'evidence_record_id',o.id,'expires_on',_expires_on));
 result:=jsonb_build_object('recorded',true,'employee_id',e.id);
 INSERT INTO public.rtw_decision_receipts(request_id,user_id,tenant_id,payload,result)
 VALUES(_request_id,auth.uid(),e.tenant_id,payload,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.record_rtw_decision_atomic(uuid,uuid,text,text,text,date,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_rtw_decision_atomic(uuid,uuid,text,text,text,date,timestamptz) TO authenticated;

-- Ordinary clients may submit information, but may not manufacture review evidence.
-- Service-role portal submissions remain supported; their validation must be reviewed separately.
CREATE FUNCTION public.protect_rtw_review_evidence() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF current_user IN ('anon','authenticated') THEN
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Review evidence cannot be deleted through the client'; END IF;
   IF TG_OP='INSERT' THEN
     IF NEW.rtw_status IN ('verified','rejected','expired') OR NEW.rtw_reviewed_at IS NOT NULL
       OR NEW.rtw_reviewed_by IS NOT NULL OR NEW.rtw_reviewed_by_name IS NOT NULL
       OR NEW.rtw_review_notes IS NOT NULL OR NEW.rtw_expires_on IS NOT NULL THEN
       RAISE EXCEPTION 'Use the secure right-to-work review action'; END IF;
   ELSIF ROW(NEW.rtw_status,NEW.rtw_reviewed_at,NEW.rtw_reviewed_by,NEW.rtw_reviewed_by_name,NEW.rtw_review_notes,NEW.rtw_expires_on,NEW.employee_id,NEW.tenant_id)
      IS DISTINCT FROM ROW(OLD.rtw_status,OLD.rtw_reviewed_at,OLD.rtw_reviewed_by,OLD.rtw_reviewed_by_name,OLD.rtw_review_notes,OLD.rtw_expires_on,OLD.employee_id,OLD.tenant_id) THEN
     RAISE EXCEPTION 'Use the secure right-to-work review action';
   END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER protect_rtw_review_evidence BEFORE INSERT OR UPDATE OR DELETE ON public.employee_onboarding_data
 FOR EACH ROW EXECUTE FUNCTION public.protect_rtw_review_evidence();

-- Once published or assigned, a module's assessment must be a new module record to change.
-- Taking the module row lock serialises publication against question editing.
CREATE FUNCTION public.protect_published_quiz_questions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d public.training_library%ROWTYPE; ids uuid[];
BEGIN
 IF TG_OP='INSERT' THEN ids:=ARRAY[NEW.document_id];
 ELSIF TG_OP='DELETE' THEN ids:=ARRAY[OLD.document_id];
 ELSE ids:=ARRAY[OLD.document_id,NEW.document_id]; END IF;
 FOR d IN SELECT * FROM public.training_library WHERE id=ANY(ids) ORDER BY id FOR UPDATE LOOP
   IF d.status IN ('published','archived') OR d.published_at IS NOT NULL
      OR EXISTS(SELECT 1 FROM public.training_assignments WHERE document_id=d.id) THEN
     RAISE EXCEPTION 'This assessment is locked. Create a separate draft version to change its questions';
   END IF;
   IF TG_OP<>'DELETE' AND NEW.document_id=d.id AND NEW.tenant_id IS DISTINCT FROM d.tenant_id THEN
     RAISE EXCEPTION 'Question workspace does not match its module'; END IF;
 END LOOP;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER protect_published_quiz_questions BEFORE INSERT OR UPDATE OR DELETE ON public.training_quiz_questions
 FOR EACH ROW EXECUTE FUNCTION public.protect_published_quiz_questions();
CREATE FUNCTION public.protect_published_assessment_rules() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF OLD.status IN ('published','archived') OR OLD.published_at IS NOT NULL
    OR EXISTS(SELECT 1 FROM public.training_assignments WHERE document_id=OLD.id) THEN
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Keep published assessment history; archive the module instead'; END IF;
   IF ROW(NEW.completion_type,NEW.pass_mark,NEW.retry_limit,NEW.requires_quiz,NEW.requires_acknowledgement,NEW.version,NEW.tenant_id,NEW.published_at)
     IS DISTINCT FROM ROW(OLD.completion_type,OLD.pass_mark,OLD.retry_limit,OLD.requires_quiz,OLD.requires_acknowledgement,OLD.version,OLD.tenant_id,OLD.published_at)
     OR (OLD.status IN ('published','archived') AND NEW.status NOT IN ('published','archived')) THEN
     RAISE EXCEPTION 'Published assessment rules are locked. Create a separate draft version'; END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER protect_published_assessment_rules BEFORE UPDATE OR DELETE ON public.training_library
 FOR EACH ROW EXECUTE FUNCTION public.protect_published_assessment_rules();
COMMIT;
