# Isolated migration test report — 26 Sep 2026

Private throwaway PostgreSQL 17 inside the build workspace; fictional staff only; no connection to live data; outbound web calls stubbed to do nothing (no email). Live database was only read (structure, permissions). Nothing installed live; nothing published.

## 1. Rebuild vs live structure
- Rebuilt from 121 + 37 history files. Rebuild-only adjustments: (a) removed template rows with no workspace before 20260311093402 (live was tidied by hand); (b) skipped 0032 (adds one real person's training record).
- Tables/columns/policies/triggers missing from history (exist live only): allergen_material_approvals, holiday_integrity_log, notification_preferences (+ their 4 policies, 1 trigger). None are touched by the three changes.
- Functions: identical (74). Triggers: identical except the one above.
- Permissions: live grants full table access (select/insert/update/delete) to anon and authenticated on every table, RLS being the gate; history grants far less. Test copy was set to live's exact permissions.
- Live-only: anon can execute allocate_contract_reference, employee_sensitive_fields, is_locked_contract_object, tenant_sensitive_fields (history revokes it). Reported separately; not changed.
- Existing live exposure: every workspace member (incl. staff) can read quiz answer keys and insert their own quiz attempts. Change 2 closes this.

## 2. Results (fictional data, live-matching permissions)
```
== M1 staff approvals
PASS | anon cannot call decide
PASS | staff member cannot approve own change
PASS | supervisor cannot approve
PASS | other workspace admin cannot approve
PASS | blank reviewer name refused
PASS | manager accepts passport change
PASS | value written to employee
PASS | one audit row written
PASS | retry identical decision is safe
PASS | retry wrote no second audit row
PASS | opposite decision after accept refused
PASS | stale submission refused (record changed since)
PASS | stale refusal left forename untouched
PASS | stale refusal left submission pending
PASS | stale submission can still be rejected
PASS | non-approved field (pay rate) refused
PASS | pay rate untouched
PASS | bank field cannot be accepted via single approval
PASS | manager cannot confirm bank details
PASS | bank: confirming only one of two pending fields refused
PASS | bank: invalid account length refused
PASS | bank: duplicate ids refused
PASS | bank: mixed employees refused
PASS | bank: admin confirms account + sort code together
PASS | bank values written, dashes stripped
PASS | two verification rows
PASS | bank audit row holds no account numbers
PASS | bank: retry is safe
PASS | retry created no extra verifications
PASS | client can no longer write decisions directly
PASS | client can no longer forge bank verification
PASS | managers can still read review history
PASS | helper staff_review_role not callable by clients
== M2 quizzes
PASS | staff loads questions without answer key
PASS | question payload excludes correct_option
PASS | staff cannot read question table directly (answer key)
PASS | direct read returns 0 rows for staff
PASS | another person cannot load this quiz
PASS | other workspace cannot submit
PASS | incomplete answers refused
PASS | out-of-range answer refused
PASS | refused submissions used no attempts
PASS | client cannot insert a fake attempt
PASS | client cannot set own quiz score
PASS | client cannot mark complete without passing
PASS | failing attempt graded on server
PASS | score 0, attempt 1 recorded
PASS | retry same request id returns same result
PASS | retry used no extra attempt
PASS | reusing request id with other answers refused
PASS | concurrent second submission waits for the first, then is refused
PASS | exactly 2 attempts, numbered 1 and 2
PASS | second attempt 50% = pass at pass mark 50
PASS | assignment completed (no ack/sign-off required)
PASS | passed quiz cannot be resubmitted
PASS | graded-on-server audit rows
PASS | managers can read questions
PASS | staff sees own attempt history
== M3 right-to-work
PASS | staff cannot record own RTW decision
PASS | supervisor cannot record RTW decision
PASS | other workspace admin refused
PASS | evidence notes required
PASS | unknown decision refused
PASS | stale evidence revision refused
PASS | verified with expiry yesterday refused
PASS | refusals changed nothing
PASS | verified expiring today (London date) allowed
PASS | decision stored with expiry
PASS | one RTW audit row
PASS | retry same request id returns stored result
PASS | retry wrote no second audit
PASS | same request id with different details refused
PASS | expired decision with past date allowed
PASS | verified with no expiry (no time limit) allowed
PASS | concurrent second reviewer waits, then sees evidence changed
PASS | only the first concurrent decision stored
PASS | client cannot write RTW fields directly (admin)
PASS | client cannot insert pre-verified evidence
PASS | client cannot delete evidence
PASS | client may still update non-review fields
PASS | RTW status unchanged by blocked writes
PASS | service role (staff portal) unaffected
PASS | receipts table hidden from clients
== M3 assessment locks
PASS | published question cannot be edited
PASS | published question cannot be deleted
PASS | no new question on published module
PASS | draft module accepts new questions
PASS | question workspace must match module
PASS | published pass mark locked
PASS | published module cannot go back to draft
PASS | published module title still editable
PASS | published module cannot be deleted
PASS | published module can be archived
PASS | staff cannot self-verify own RTW
```

Published app (PR #11, live now) against the changed database — every old direct write now FAILS WITH AN ERROR (never silently):
| Published feature | Before | After |
|---|---|---|
| Approve staff detail change | works (direct write) | "permission denied" |
| Confirm bank details | direct write | "permission denied" |
| Staff opens a quiz | reads questions incl. answers | sees no questions |
| Staff submits quiz | direct write | "permission denied" |
| Right-to-work review | direct write | "Use the secure right-to-work review action" |
| Edit questions of a published module | allowed | "This assessment is locked" |
After rollback, all six behave exactly as before.

Defect found: after change 2, managers cannot read standard-library questions (38 questions / 8 modules live), so "adopt standard module" would silently create a module with no questions. Proposed fix 20260926120500_standard_library_question_read.proposed.sql — tested: managers read them, staff still read none.

Forced failure (division by zero before COMMIT) in each change: 0 structural differences afterwards — each change is all-or-nothing.
Rollback of all three with test data present: evidence rows unchanged (audit 7, attempts 2, bank verifications 2, receipts 4); only difference from pre-install is the two retained receipt tables (kept deliberately as evidence).
Bundled synthetic tests also pass: staff approvals 19, assessments 12, right-to-work 17.

## 3. Coordinated release plan (for your approval — not executed)
Preview and production share one database, so installing affects the live app immediately; the live app only works with the new database after publishing.
1. Quiet time (no reviews/quizzes in progress). Note the time for point-in-time recovery.
2. Install in one sitting, in order: 20260926110000 -> 20260926120000 -> 20260926120500 (fix) -> 20260926130000. Each is all-or-nothing; if any fails, stop (earlier ones stay, app still fails closed).
3. Publish immediately after (preview code already uses the new actions). Gap between steps 2 and 3: a few minutes where the live approval / quiz / RTW screens show errors — no data changes.
4. Smoke test signed in: one fictional/sandbox approval, one quiz, one RTW review; check audit rows.
Recovery: if something is wrong after publishing, first restore the previous app version (History), then run the rollback scripts in reverse (130000 -> 120000 -> 110000; the fix is removed by the 120000 rollback). Decisions, attempts, bank verifications and audit rows are kept. Point-in-time restore is the last resort (would lose everything written after step 1).

## 4. Holiday payments (separate, 20260925090000)
Purpose: record/edit/remove holiday payments in one server transaction with its holiday-ledger entry and payroll totals; block changes inside approved/closed pay periods; private retry receipts; clients can no longer write holiday_payments directly.
Results: applies cleanly to the rebuilt live-like structure; forced failure leaves 0 differences; bundled synthetic tests 32/32 pass (single-session only — no concurrency claim).
Published-app impact: the live app and preview ALREADY call the new action, so holiday-payment saves currently error in production; installing this fixes them. Rollback script not yet written — ask if wanted before installing.

## 5. Exact SQL

### 20260926110000_atomic_staff_approvals.sql
sha256 78cac937c8b72d29…
```sql
-- PROPOSAL: apply only after schema review and staging verification.
-- No existing staff values are rewritten by this migration.
BEGIN;

CREATE OR REPLACE FUNCTION public.staff_review_role(_tenant uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT role::text FROM public.tenant_members
  WHERE tenant_id = _tenant AND user_id = auth.uid() AND is_active
    AND role::text IN ('company_admin', 'manager') LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.staff_review_role(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.decide_staff_detail_atomic(
  _change_id uuid, _accept boolean, _reviewer text, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c public.staff_detail_changes%ROWTYPE; e public.employees%ROWTYPE;
  employee uuid; tenant uuid; desired text; value_now text;
BEGIN
  IF auth.uid() IS NULL OR _accept IS NULL OR nullif(btrim(_reviewer), '') IS NULL THEN
    RAISE EXCEPTION 'Sign in and provide a review decision and reviewer name'; END IF;
  SELECT employee_id, tenant_id INTO employee, tenant FROM public.staff_detail_changes WHERE id = _change_id;
  IF NOT FOUND OR public.staff_review_role(tenant) IS NULL THEN RAISE EXCEPTION 'Staff review access required' USING ERRCODE='42501'; END IF;
  -- All staff approval operations lock the employee first, then submissions.
  SELECT * INTO e FROM public.employees WHERE id=employee AND tenant_id=tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employee record not found'; END IF;
  SELECT * INTO c FROM public.staff_detail_changes WHERE id=_change_id FOR UPDATE;
  IF c.employee_id IS DISTINCT FROM e.id OR c.tenant_id IS DISTINCT FROM e.tenant_id THEN RAISE EXCEPTION 'Submission changed; reload the review'; END IF;
  desired := CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END;
  IF c.state = desired THEN RETURN jsonb_build_object('change_id', c.id, 'state', c.state, 'already_done', true); END IF;
  IF c.state <> 'pending' THEN RAISE EXCEPTION 'This submission already has a different decision'; END IF;
  IF c.field_name NOT IN ('forename','surname','preferred_name','email','date_of_birth','ni_number','nationality','passport_no','sharing_code','settlement_status','bank_account_no','sort_code') THEN
    RAISE EXCEPTION 'This field is not approved for staff-detail updates'; END IF;
  IF _accept AND c.field_name IN ('bank_account_no','sort_code') THEN
    RAISE EXCEPTION 'Use direct bank confirmation to approve banking details together'; END IF;
  IF _accept THEN
    value_now := to_jsonb(e)->>c.field_name;
    IF nullif(btrim(value_now),'') IS DISTINCT FROM nullif(btrim(c.old_value),'') THEN
      RAISE EXCEPTION 'The staff record changed since this submission. Reload and review the latest value.'; END IF;
    IF nullif(btrim(c.new_value),'') IS NULL THEN RAISE EXCEPTION 'An empty submission cannot replace a staff value'; END IF;
    -- Field name is restricted above; PostgreSQL performs the actual column type conversion.
    EXECUTE format('UPDATE public.employees SET %I = (jsonb_populate_record(NULL::public.employees,$1)).%I WHERE id=$2 AND tenant_id=$3', c.field_name, c.field_name)
      USING jsonb_build_object(c.field_name,c.new_value), e.id, e.tenant_id;
  END IF;
  UPDATE public.staff_detail_changes SET state=desired, decided_by=auth.uid(), decided_by_name=btrim(_reviewer), decided_at=clock_timestamp(), notes=coalesce(nullif(btrim(_notes),''),notes)
    WHERE id=c.id;
  INSERT INTO public.audit_log(tenant_id,user_id,action,table_name,record_id,new_data)
    VALUES(tenant,auth.uid(),'update','staff_detail_changes',c.id,
      jsonb_build_object('field',c.field_name,'decision',desired,'applied_to_record',_accept,'atomic',true));
  RETURN jsonb_build_object('change_id',c.id,'state',desired,'already_done',false);
END $$;

CREATE OR REPLACE FUNCTION public.confirm_staff_bank_atomic(
  _change_ids uuid[], _reviewer text, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c public.staff_detail_changes%ROWTYPE; e public.employees%ROWTYPE;
  employee uuid; tenant uuid; n int; done_count int; fields int;
  account text; sortcode text;
BEGIN
  IF auth.uid() IS NULL OR nullif(btrim(_reviewer),'') IS NULL OR coalesce(cardinality(_change_ids),0) NOT BETWEEN 1 AND 2 THEN
    RAISE EXCEPTION 'Select the account details and provide the person who confirmed them'; END IF;
  IF (SELECT count(DISTINCT id) FROM unnest(_change_ids) id) <> cardinality(_change_ids) THEN RAISE EXCEPTION 'Duplicate change ids'; END IF;
  SELECT employee_id,tenant_id INTO employee,tenant FROM public.staff_detail_changes WHERE id=_change_ids[1];
  IF NOT FOUND OR public.staff_review_role(tenant) IS DISTINCT FROM 'company_admin' THEN RAISE EXCEPTION 'Company administrator confirmation required' USING ERRCODE='42501'; END IF;
  SELECT * INTO e FROM public.employees WHERE id=employee AND tenant_id=tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employee record not found'; END IF;
  PERFORM id FROM public.staff_detail_changes WHERE id=ANY(_change_ids) ORDER BY id FOR UPDATE;
  SELECT count(*),count(DISTINCT field_name) INTO n,fields FROM public.staff_detail_changes
    WHERE id=ANY(_change_ids) AND employee_id=employee AND tenant_id=tenant
      AND field_name IN ('bank_account_no','sort_code') AND state IN ('pending','accepted');
  IF n<>cardinality(_change_ids) OR fields<>n THEN RAISE EXCEPTION 'Bank changes must belong to one employee and contain different banking fields'; END IF;
  SELECT count(DISTINCT change_id) INTO done_count FROM public.bank_detail_verifications
    WHERE change_id=ANY(_change_ids) AND employee_id=employee AND tenant_id=tenant AND confirmed_directly;
  IF done_count=n THEN RETURN jsonb_build_object('employee_id',employee,'already_done',true); END IF;
  IF done_count<>0 THEN RAISE EXCEPTION 'Some bank details were already confirmed. Reload before continuing.'; END IF;
  IF EXISTS(SELECT 1 FROM public.staff_detail_changes WHERE employee_id=employee AND tenant_id=tenant AND field_name IN ('bank_account_no','sort_code')
      AND state='pending' AND needs_review AND NOT (id=ANY(_change_ids))) THEN
    RAISE EXCEPTION 'Review all pending banking changes together; reject superseded submissions first'; END IF;
  account := e.bank_account_no; sortcode := e.sort_code;
  FOR c IN SELECT * FROM public.staff_detail_changes WHERE id=ANY(_change_ids) ORDER BY id LOOP
    IF regexp_replace(coalesce(to_jsonb(e)->>c.field_name,''),'[ -]','','g') IS DISTINCT FROM regexp_replace(coalesce(c.old_value,''),'[ -]','','g') THEN
      RAISE EXCEPTION 'The bank record changed since submission. Confirm the latest account with the employee.'; END IF;
    IF c.field_name='bank_account_no' THEN account:=regexp_replace(coalesce(c.new_value,''),'[ -]','','g');
    ELSE sortcode:=regexp_replace(coalesce(c.new_value,''),'[ -]','','g'); END IF;
  END LOOP;
  IF account IS NULL OR sortcode IS NULL OR account !~ '^[0-9]{8}$' OR sortcode !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'Account number must have eight digits and sort code six digits'; END IF;
  UPDATE public.employees SET bank_account_no=account,sort_code=sortcode WHERE id=employee AND tenant_id=tenant;
  FOR c IN SELECT * FROM public.staff_detail_changes WHERE id=ANY(_change_ids) ORDER BY id LOOP
    INSERT INTO public.bank_detail_verifications(tenant_id,employee_id,change_id,verified_by,verified_by_name,confirmed_directly,notes)
      VALUES(tenant,employee,c.id,auth.uid(),btrim(_reviewer),true,nullif(btrim(_notes),''));
    UPDATE public.staff_detail_changes SET state='accepted',decided_by=auth.uid(),decided_by_name=btrim(_reviewer),decided_at=clock_timestamp(),notes='Confirmed directly with the employee before pay used the new account' WHERE id=c.id;
  END LOOP;
  INSERT INTO public.audit_log(tenant_id,user_id,action,table_name,record_id,new_data)
    VALUES(tenant,auth.uid(),'update','bank_detail_verifications',employee,jsonb_build_object('change_ids',_change_ids,'confirmed_directly',true,'atomic',true));
  RETURN jsonb_build_object('employee_id',employee,'already_done',false);
END $$;

REVOKE ALL ON FUNCTION public.decide_staff_detail_atomic(uuid,boolean,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.confirm_staff_bank_atomic(uuid[],text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.decide_staff_detail_atomic(uuid,boolean,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_staff_bank_atomic(uuid[],text,text) TO authenticated;
-- Client applications can read their permitted review history, but cannot forge decisions/evidence.
REVOKE INSERT,UPDATE,DELETE ON public.staff_detail_changes,public.bank_detail_verifications FROM PUBLIC,anon,authenticated;
COMMIT;
```

### 20260926120000_server_training_assessments.sql
sha256 7d864fd3a6e343f9…
```sql
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
```

### 20260926120500_standard_library_question_read.proposed.sql
sha256 0a7a3948ba8de491…
```sql
-- PROPOSED AMENDMENT to 20260926120000 (found in isolated testing, 26 Sep 2026).
-- Without it, managers can no longer read standard-library (tenant_id IS NULL) questions, so
-- "adopt standard module" silently copies a module with zero questions. Staff still cannot read answers.
BEGIN;
CREATE POLICY assessment_authors_read_standard ON public.training_quiz_questions FOR SELECT TO authenticated
  USING (tenant_id IS NULL AND EXISTS (SELECT 1 FROM public.tenant_members m
    WHERE m.user_id = auth.uid() AND m.is_active AND m.role::text IN ('company_admin','manager')));
COMMIT;
```

### 20260926130000_onboarding_evidence_guards.sql
sha256 77fe967a484b10dc…
```sql
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
```

### rollback/20260926130000_onboarding_evidence_guards.down.sql
sha256 cd78091d520bfbb5…
```sql
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
```

### rollback/20260926120000_server_training_assessments.down.sql
sha256 70377834c18fa5bd…
```sql
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
```

### rollback/20260926110000_atomic_staff_approvals.down.sql
sha256 ee7b58adff56afb1…
```sql
-- RECOVERY ONLY. Reverses 20260926110000_atomic_staff_approvals.sql, restoring the exact live grants of 26 Sep 2026.
-- Decisions, bank verifications and audit rows already written are kept.
BEGIN;
DROP FUNCTION IF EXISTS public.confirm_staff_bank_atomic(uuid[],text,text);
DROP FUNCTION IF EXISTS public.decide_staff_detail_atomic(uuid,boolean,text,text);
DROP FUNCTION IF EXISTS public.staff_review_role(uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_detail_changes, public.bank_detail_verifications TO anon, authenticated;
COMMIT;
```

### 20260925090000_atomic_holiday_payments.sql
sha256 39e595e00e41668a…
```sql
-- PROPOSED ONLY. Review deployed schema and test on staging before applying.
-- No existing payroll, employee or ledger rows are repaired/backfilled here.
BEGIN;

CREATE TABLE public.holiday_payment_operations (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  request_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  request jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, request_id)
);
ALTER TABLE public.holiday_payment_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.holiday_payment_operations FROM PUBLIC, anon, authenticated;
-- Private server-owned retry receipts. No client policies or write grants.

-- Lock both parents for moves; validate their tenant before any child write.
-- Deleting a parent may cascade after it is no longer visible to this trigger.
CREATE OR REPLACE FUNCTION public.guard_payroll_child_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  old_id uuid; new_id uuid; parent public.payroll_periods%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_id := OLD.payroll_period_id; END IF;
  IF TG_OP <> 'DELETE' THEN new_id := NEW.payroll_period_id; END IF;
  FOR parent IN SELECT * FROM public.payroll_periods
    WHERE id IN (old_id, new_id) ORDER BY id FOR UPDATE
  LOOP
    IF parent.status::text NOT IN ('draft', 'pending', 'rejected') THEN
      RAISE EXCEPTION 'This payroll period is locked. Reopen it before changing entries or holiday payments.' USING ERRCODE = '55000';
    END IF;
    IF (parent.id = old_id AND parent.tenant_id IS DISTINCT FROM OLD.tenant_id)
       OR (parent.id = new_id AND parent.tenant_id IS DISTINCT FROM NEW.tenant_id) THEN
      RAISE EXCEPTION 'Payroll workspace mismatch' USING ERRCODE = '42501';
    END IF;
  END LOOP;
  IF TG_OP <> 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.payroll_periods WHERE id = new_id AND tenant_id = NEW.tenant_id) THEN
      RAISE EXCEPTION 'Payroll period not found in this workspace' USING ERRCODE = '42501';
    END IF;
    IF NEW.employee_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.employees WHERE id = NEW.employee_id AND tenant_id = NEW.tenant_id
    ) THEN RAISE EXCEPTION 'Employee does not belong to this workspace' USING ERRCODE = '42501'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.guard_payroll_child_write() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_approved_payroll_entries ON public.payroll_entries;
CREATE TRIGGER trg_protect_approved_payroll_entries BEFORE INSERT OR UPDATE OR DELETE
  ON public.payroll_entries FOR EACH ROW EXECUTE FUNCTION public.guard_payroll_child_write();
DROP TRIGGER IF EXISTS trg_protect_approved_holiday_payments ON public.holiday_payments;
CREATE TRIGGER trg_protect_approved_holiday_payments BEFORE INSERT OR UPDATE OR DELETE
  ON public.holiday_payments FOR EACH ROW EXECUTE FUNCTION public.guard_payroll_child_write();

-- Both sources update the same locked parent; a move recalculates both parents.
CREATE OR REPLACE FUNCTION public.sync_payroll_period_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE old_id uuid; new_id uuid; pid uuid; worked numeric; holidays numeric;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_id := OLD.payroll_period_id; END IF;
  IF TG_OP <> 'DELETE' THEN new_id := NEW.payroll_period_id; END IF;
  FOR pid IN SELECT id FROM public.payroll_periods WHERE id IN (old_id, new_id) ORDER BY id FOR UPDATE LOOP
    SELECT coalesce(sum(total_pay), 0) INTO worked FROM public.payroll_entries WHERE payroll_period_id = pid;
    SELECT coalesce(sum(total), 0) INTO holidays FROM public.holiday_payments WHERE payroll_period_id = pid;
    UPDATE public.payroll_periods SET timesheet_total = worked, holidays_total = holidays,
      grand_total = worked + holidays WHERE id = pid;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_payroll_period_totals() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_holiday_payment_totals ON public.holiday_payments;
CREATE TRIGGER trg_sync_holiday_payment_totals AFTER INSERT OR UPDATE OR DELETE
  ON public.holiday_payments FOR EACH ROW EXECUTE FUNCTION public.sync_payroll_period_totals();

-- Reopening is a status-only action, not an opportunity to change locked sums.
CREATE OR REPLACE FUNCTION public.protect_approved_payroll_periods()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status::text IN ('approved', 'finalised', 'finalized') THEN
    IF TG_OP = 'UPDATE' AND NEW.status::text = 'draft'
      AND NEW.approved_by IS NULL AND NEW.approved_at IS NULL
      AND (to_jsonb(NEW) - ARRAY['status','approved_by','approved_at','updated_at'])
        = (to_jsonb(OLD) - ARRAY['status','approved_by','approved_at','updated_at']) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'This payroll period is locked. Reopen it separately before editing.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.mutate_holiday_payment_atomic(
  _tenant_id uuid, _request_id uuid, _operation text,
  _payment_id uuid, _values jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  uid uuid := auth.uid(); receipt public.holiday_payment_operations%ROWTYPE;
  previous public.holiday_payments%ROWTYPE; saved public.holiday_payments%ROWTYPE;
  period public.payroll_periods%ROWTYPE; employee public.employees%ROWTYPE;
  pid uuid; eid uuid; request jsonb; result jsonb; ledger_count int;
  h numeric; r numeric; d date; note text; balance numeric; adjustment numeric; basis text;
BEGIN
  IF uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenant_members
      WHERE tenant_id = _tenant_id AND user_id = uid AND is_active AND role::text = 'company_admin') THEN
    RAISE EXCEPTION 'An active company administrator is required for holiday payroll payments.' USING ERRCODE = '42501';
  END IF;
  IF _request_id IS NULL OR _payment_id IS NULL OR _operation IS NULL
      OR _operation NOT IN ('create', 'update', 'delete', 'settle') OR jsonb_typeof(_values) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid holiday payment request' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(_values) k WHERE k NOT IN
    ('employee_id','employee_name','payroll_period_id','hours','rate','total','holiday_taken_date','leave_year_start','leave_year_end','notes','settlement_basis','adjustment_reason','expected_balance')) THEN
    RAISE EXCEPTION 'Unsupported holiday payment field' USING ERRCODE = '22023';
  END IF;
  request := jsonb_build_object('operation', _operation, 'payment_id', _payment_id, 'values', _values);
  -- Same request serialises even if a caller tries to reuse it for another period.
  PERFORM pg_advisory_xact_lock(hashtextextended('holiday-request:' || _tenant_id || ':' || _request_id, 0));
  SELECT * INTO receipt FROM public.holiday_payment_operations WHERE tenant_id = _tenant_id AND request_id = _request_id;
  IF FOUND THEN
    IF receipt.actor_id <> uid OR receipt.request <> request THEN
      RAISE EXCEPTION 'This request ID was used for a different operation' USING ERRCODE = '22023';
    END IF;
    RETURN receipt.result || jsonb_build_object('idempotent_replay', true);
  END IF;
  IF _operation IN ('create','settle') THEN
    pid := (_values->>'payroll_period_id')::uuid;
    eid := (_values->>'employee_id')::uuid;
  ELSE
    SELECT * INTO previous FROM public.holiday_payments WHERE id = _payment_id AND tenant_id = _tenant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Holiday payment not found in this workspace'; END IF;
    -- A settlement also changes entitlement/lifecycle. Ordinary payment edits
    -- must not leave those companion changes behind or permit a second payout.
    IF previous.notes ILIKE '%leaver settlement%' OR EXISTS (
      SELECT 1 FROM public.holiday_payment_operations o WHERE o.tenant_id = _tenant_id
        AND o.request->>'operation' = 'settle' AND o.result->>'payment_id' = _payment_id::text
    ) THEN RAISE EXCEPTION 'Leaver settlements require a reviewed settlement reversal, not an ordinary payment edit.'; END IF;
    pid := previous.payroll_period_id; eid := previous.employee_id;
    IF (_values ? 'payroll_period_id' AND (_values->>'payroll_period_id')::uuid IS DISTINCT FROM pid)
      OR (_values ? 'employee_id' AND (_values->>'employee_id')::uuid IS DISTINCT FROM eid) THEN
      RAISE EXCEPTION 'Moving a holiday payment requires a separate reviewed correction';
    END IF;
  END IF;
  -- Match the period recovery lock order: advisory period, parent row, children.
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll_period:' || pid, 0));
  SELECT * INTO period FROM public.payroll_periods WHERE id = pid AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll period not found in this workspace'; END IF;
  IF period.status::text NOT IN ('draft','pending') THEN
    RAISE EXCEPTION 'Holiday payments require a draft or pending period. Reopen the period first.' USING ERRCODE = '55000';
  END IF;
  IF _operation NOT IN ('create','settle') THEN
    SELECT * INTO saved FROM public.holiday_payments WHERE id = _payment_id AND tenant_id = _tenant_id FOR UPDATE;
    IF NOT FOUND OR saved IS DISTINCT FROM previous THEN
      RAISE EXCEPTION 'The payment changed during this request. Refresh and review it again.' USING ERRCODE = '40001';
    END IF;
  END IF;
  SELECT * INTO employee FROM public.employees WHERE id = eid AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND AND _operation <> 'delete' THEN RAISE EXCEPTION 'Employee not found in this workspace'; END IF;

  -- Refuse ambiguous legacy sources rather than silently removing corrections.
  PERFORM 1 FROM public.holiday_ledger WHERE source_table = 'holiday_payments' AND source_id = _payment_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.holiday_ledger WHERE source_table = 'holiday_payments' AND source_id = _payment_id
    AND (tenant_id IS DISTINCT FROM _tenant_id OR employee_id IS DISTINCT FROM eid OR entry_type::text <> 'holiday_taken')) THEN
    RAISE EXCEPTION 'This payment has historical ledger corrections and needs a reviewed correction.';
  END IF;
  IF _operation NOT IN ('create','settle') AND EXISTS (
    SELECT 1 FROM public.holiday_ledger c JOIN public.holiday_ledger original
      ON c.source_table = 'holiday_ledger' AND c.source_id = original.id
    WHERE original.source_table = 'holiday_payments' AND original.source_id = _payment_id
  ) THEN RAISE EXCEPTION 'A correction refers to this ledger entry; review it before changing the payment.'; END IF;

  IF _operation = 'delete' THEN
    DELETE FROM public.holiday_ledger WHERE source_table = 'holiday_payments' AND source_id = _payment_id AND tenant_id = _tenant_id;
    DELETE FROM public.holiday_payments WHERE id = _payment_id AND tenant_id = _tenant_id;
    result := jsonb_build_object('payment_id', _payment_id, 'employee_id', eid, 'deleted', true);
  ELSE
    h := CASE WHEN _values ? 'hours' THEN (_values->>'hours')::numeric ELSE previous.hours END;
    r := CASE WHEN _values ? 'rate' THEN (_values->>'rate')::numeric ELSE previous.rate END;
    d := CASE WHEN _values ? 'holiday_taken_date' THEN (_values->>'holiday_taken_date')::date ELSE previous.holiday_taken_date END;
    note := CASE WHEN _values ? 'notes' THEN _values->>'notes' ELSE previous.notes END;
    IF h IS NULL OR r IS NULL OR d IS NULL OR NOT isfinite(d) OR h < 0 OR (h = 0 AND _operation <> 'settle') OR r <= 0
      OR h::text IN ('NaN','Infinity','-Infinity') OR r::text IN ('NaN','Infinity','-Infinity')
      OR h <> round(h, 2) OR r <> round(r, 2) THEN
      RAISE EXCEPTION 'Enter a valid date and positive hours/rate with at most two decimal places.' USING ERRCODE = '22023';
    END IF;
    IF _values ? 'total' AND ((_values->>'total')::numeric IS DISTINCT FROM round(h*r, 2)) THEN
      RAISE EXCEPTION 'Payment total does not match hours multiplied by rate.' USING ERRCODE = '22023';
    END IF;
    IF _operation = 'settle' THEN
      basis := _values->>'settlement_basis';
      IF basis IS NULL OR basis NOT IN ('current_year','live_accrual','manual') THEN
        RAISE EXCEPTION 'Settle one verified leave year at a time. Historical years require review.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.holiday_payments WHERE employee_id = eid AND tenant_id = _tenant_id
        AND leave_year_start = date_trunc('year',d)::date AND notes ILIKE '%leaver settlement%')
        OR EXISTS (SELECT 1 FROM public.holiday_payment_operations o WHERE o.tenant_id = _tenant_id
          AND o.request->>'operation' = 'settle' AND o.request->'values'->>'employee_id' = eid::text
          AND left(o.request->'values'->>'holiday_taken_date',4) = extract(year from d)::int::text
          AND (o.result->'payment' = 'null'::jsonb OR EXISTS (SELECT 1 FROM public.holiday_payments hp WHERE hp.id = (o.result->>'payment_id')::uuid))) THEN
        RAISE EXCEPTION 'A settlement already exists for this employee and leave year. Review it before paying again.';
      END IF;
      SELECT coalesce(sum(hours),0) INTO balance FROM public.holiday_ledger
        WHERE employee_id = eid AND tenant_id = _tenant_id AND leave_year_start = date_trunc('year',d)::date;
      IF basis IN ('live_accrual','manual') THEN
        SELECT balance + coalesce(sum(e.holiday_accrued_hours),0) INTO balance
        FROM public.payroll_entries e JOIN public.payroll_periods p ON p.id = e.payroll_period_id
        WHERE e.employee_id = eid AND e.tenant_id = _tenant_id AND p.tenant_id = _tenant_id
          AND p.status::text IN ('draft','pending','rejected')
          AND extract(year from p.start_date) = extract(year from d)
          AND NOT EXISTS (SELECT 1 FROM public.holiday_ledger l WHERE l.source_table = 'payroll_entries'
            AND l.source_id = e.id AND l.entry_type = 'accrual');
      END IF;
      IF NOT (_values ? 'expected_balance') OR (_values->>'expected_balance')::numeric IS DISTINCT FROM round(balance,2) THEN
        RAISE EXCEPTION 'The holiday balance changed or its sources disagree. Refresh and review before settling.' USING ERRCODE = '40001';
      END IF;
      IF basis = 'manual' THEN
        IF nullif(btrim(_values->>'adjustment_reason'),'') IS NULL THEN RAISE EXCEPTION 'A reason is required for a manual adjustment'; END IF;
        adjustment := h - balance;
        IF adjustment <> 0 THEN
          INSERT INTO public.holiday_ledger(employee_id,tenant_id,leave_year_start,entry_date,entry_type,hours,source_table,source_id,notes,created_by)
          VALUES(eid,_tenant_id,date_trunc('year',d)::date,d,'manual_adjustment',adjustment,'holiday_payment_operations',_request_id,
            'Settlement adjustment: ' || (_values->>'adjustment_reason'),uid);
        END IF;
      ELSIF h IS DISTINCT FROM greatest(0,round(balance,2)) THEN
        RAISE EXCEPTION 'Settlement hours do not match the reviewed balance';
      END IF;
      note := 'Leaver settlement (basis: ' || basis || '). ' || coalesce(note,'');
    END IF;
    IF _operation IN ('create','settle') AND h > 0 THEN
      INSERT INTO public.holiday_payments(id, tenant_id, employee_id, employee_name, payroll_period_id,
        hours, rate, total, holiday_taken_date, leave_year_start, leave_year_end, notes)
      VALUES (_payment_id, _tenant_id, eid, concat_ws(' ', employee.forename, employee.surname), pid,
        h, r, round(h*r, 2), d, date_trunc('year', d)::date, (date_trunc('year',d)+interval '1 year - 1 day')::date, note)
      RETURNING * INTO saved;
    ELSIF _operation = 'update' THEN
      UPDATE public.holiday_payments SET hours = h, rate = r, total = round(h*r, 2), holiday_taken_date = d,
        leave_year_start = date_trunc('year',d)::date, leave_year_end = (date_trunc('year',d)+interval '1 year - 1 day')::date, notes = note
        WHERE id = _payment_id AND tenant_id = _tenant_id RETURNING * INTO saved;
    END IF;
    IF h > 0 THEN
    UPDATE public.holiday_ledger SET hours = -saved.hours, amount = -saved.total,
      entry_date = saved.holiday_taken_date, leave_year_start = saved.leave_year_start, notes = saved.notes
      WHERE source_table = 'holiday_payments' AND source_id = saved.id AND entry_type = 'holiday_taken' AND tenant_id = _tenant_id;
    GET DIAGNOSTICS ledger_count = ROW_COUNT;
    IF ledger_count = 0 THEN
      INSERT INTO public.holiday_ledger(employee_id,tenant_id,leave_year_start,entry_date,entry_type,hours,amount,source_table,source_id,notes,created_by)
      VALUES(eid,_tenant_id,saved.leave_year_start,saved.holiday_taken_date,'holiday_taken',-saved.hours,-saved.total,'holiday_payments',saved.id,saved.notes,uid);
    ELSIF ledger_count <> 1 THEN RAISE EXCEPTION 'Ambiguous holiday ledger source'; END IF;
    END IF;
    result := jsonb_build_object('payment_id', _payment_id, 'employee_id', eid, 'payment', CASE WHEN h > 0 THEN to_jsonb(saved) ELSE 'null'::jsonb END);
    IF _operation = 'settle' THEN
      IF employee.status::text <> 'leaver' THEN
        UPDATE public.employees SET status = 'leaver', end_date = d WHERE id = eid AND tenant_id = _tenant_id;
        INSERT INTO public.audit_log(user_id,action,table_name,record_id,tenant_id,old_data,new_data)
        VALUES(uid,'update','employees',eid,_tenant_id,jsonb_build_object('status',employee.status,'end_date',employee.end_date),
          jsonb_build_object('status','leaver','end_date',d,'operation','holiday_settlement','request_id',_request_id));
      END IF;
      result := result || jsonb_build_object('settled',true);
    END IF;
  END IF;
  INSERT INTO public.audit_log(user_id,action,table_name,record_id,tenant_id,old_data,new_data)
    VALUES(uid, CASE _operation WHEN 'create' THEN 'create'::public.audit_action WHEN 'settle' THEN 'create'::public.audit_action WHEN 'delete' THEN 'delete'::public.audit_action ELSE 'update'::public.audit_action END,
      'holiday_payments',_payment_id,_tenant_id,CASE WHEN _operation NOT IN ('create','settle') THEN to_jsonb(previous) END,
      jsonb_build_object('operation', 'holiday_payment_' || _operation, 'request_id', _request_id, 'result', result));
  result := result || jsonb_build_object('idempotent_replay', false);
  INSERT INTO public.holiday_payment_operations(tenant_id,request_id,actor_id,request,result)
    VALUES(_tenant_id,_request_id,uid,request,result);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.mutate_holiday_payment_atomic(uuid,uuid,text,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mutate_holiday_payment_atomic(uuid,uuid,text,uuid,jsonb) TO authenticated;
-- Stops old browser clients from falling back to unsafe multi-request writes.
-- Server maintenance uses service_role; it must still honour the new lock triggers.
REVOKE INSERT, UPDATE, DELETE ON public.holiday_payments FROM PUBLIC, anon, authenticated;
-- Payment-sourced debits are controlled by the transaction, not separate browser writes.
CREATE POLICY holiday_payment_ledger_insert_guard ON public.holiday_ledger AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK ((source_table IS NULL OR source_table NOT IN ('holiday_payments','holiday_payment_operations')));
CREATE POLICY holiday_payment_ledger_update_guard ON public.holiday_ledger AS RESTRICTIVE
  FOR UPDATE TO authenticated USING ((source_table IS NULL OR source_table NOT IN ('holiday_payments','holiday_payment_operations')))
  WITH CHECK ((source_table IS NULL OR source_table NOT IN ('holiday_payments','holiday_payment_operations')));
CREATE POLICY holiday_payment_ledger_delete_guard ON public.holiday_ledger AS RESTRICTIVE
  FOR DELETE TO authenticated USING ((source_table IS NULL OR source_table NOT IN ('holiday_payments','holiday_payment_operations')));
COMMIT;
```
