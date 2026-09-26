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
