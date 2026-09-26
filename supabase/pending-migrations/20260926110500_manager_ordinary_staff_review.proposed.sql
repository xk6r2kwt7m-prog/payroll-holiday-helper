-- PROPOSED ONLY (26 Sep 2026). Amendment to 20260926110000_atomic_staff_approvals; install directly after it.
-- Lets an active manager accept or reject ordinary staff details (names, preferred name, email,
-- nationality) for staff they can already see, and nothing else. Company administrators are unchanged.
-- No sensitive-data permission is widened: read access to protected submissions is still admin-only (RLS).
BEGIN;
CREATE OR REPLACE FUNCTION public.decide_staff_detail_atomic(
  _change_id uuid, _accept boolean, _reviewer text, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c public.staff_detail_changes%ROWTYPE; e public.employees%ROWTYPE;
  employee uuid; tenant uuid; desired text; value_now text; reviewer_role text;
BEGIN
  IF auth.uid() IS NULL OR _accept IS NULL OR nullif(btrim(_reviewer), '') IS NULL THEN
    RAISE EXCEPTION 'Sign in and provide a review decision and reviewer name'; END IF;
  SELECT employee_id, tenant_id INTO employee, tenant FROM public.staff_detail_changes WHERE id = _change_id;
  reviewer_role := CASE WHEN FOUND THEN public.staff_review_role(tenant) END;
  IF reviewer_role IS NULL THEN RAISE EXCEPTION 'Staff review access required' USING ERRCODE='42501'; END IF;
  -- All staff approval operations lock the employee first, then submissions.
  SELECT * INTO e FROM public.employees WHERE id=employee AND tenant_id=tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employee record not found'; END IF;
  SELECT * INTO c FROM public.staff_detail_changes WHERE id=_change_id FOR UPDATE;
  IF c.employee_id IS DISTINCT FROM e.id OR c.tenant_id IS DISTINCT FROM e.tenant_id THEN RAISE EXCEPTION 'Submission changed; reload the review'; END IF;
  -- Managers decide ordinary details only, for staff in their own branches. Protected rows
  -- (bank, NI, passport, share code, residence permit, date of birth, settlement status) stay
  -- with a company administrator. Checked before any other answer so nothing about the row leaks.
  IF reviewer_role = 'manager' AND (c.sensitive OR c.field_name NOT IN ('forename','surname','preferred_name','email','nationality')
      OR NOT public.can_view_employee(e.id)) THEN
    RAISE EXCEPTION 'This change needs a company administrator' USING ERRCODE='42501'; END IF;
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
COMMIT;
