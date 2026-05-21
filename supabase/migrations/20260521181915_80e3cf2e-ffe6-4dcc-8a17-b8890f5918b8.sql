
-- =============================================================
-- activate_contract_terms(_contract_id)
-- Called after a contract is fully signed (from sign-contract edge fn).
-- Reads structured fields from the signed contract row + its amendment row
-- (if any), falls back to current employee profile values for v1 contracts,
-- and writes a new employee_contract_terms row.
-- =============================================================
CREATE OR REPLACE FUNCTION public.activate_contract_terms(_contract_id uuid)
RETURNS public.employee_contract_terms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _doc            public.employee_documents%ROWTYPE;
  _emp            public.employees%ROWTYPE;
  _amendment      public.contract_amendments%ROWTYPE;
  _effective_from date;
  _today          date := CURRENT_DATE;
  _status         text;
  _root_id        uuid;
  _prev_terms     public.employee_contract_terms%ROWTYPE;
  _new_terms      public.employee_contract_terms;
  _changes        jsonb;
  _hourly_rate    numeric;
  _annual_salary  numeric;
  _pay_type       text;
  _contracted_hrs numeric;
  _department     text;
  _role_title     text;
  _work_location  text;
  _employment_typ text;
  _probation_end  date;
  _is_apprentice  boolean;
  _svc_eligible   boolean;
  _overtime_model text;
  _holiday_method text;
BEGIN
  SELECT * INTO _doc FROM public.employee_documents WHERE id = _contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract % not found', _contract_id;
  END IF;
  IF _doc.document_type::text <> 'contract' THEN
    RAISE EXCEPTION 'Document % is not a contract', _contract_id;
  END IF;
  IF COALESCE(_doc.contract_state,'') <> 'signed' THEN
    RAISE EXCEPTION 'Contract % is not in signed state (state=%)', _contract_id, _doc.contract_state;
  END IF;

  SELECT * INTO _emp FROM public.employees WHERE id = _doc.employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee % not found', _doc.employee_id;
  END IF;

  SELECT * INTO _amendment
    FROM public.contract_amendments
   WHERE new_contract_id = _contract_id
   LIMIT 1;

  _root_id := COALESCE(_doc.root_contract_id, _doc.id);
  _effective_from := COALESCE(_doc.effective_date,
                              _amendment.effective_date,
                              _emp.start_date,
                              _today);
  _status := CASE WHEN _effective_from <= _today THEN 'active' ELSE 'scheduled' END;

  -- Idempotency: if a terms row already exists for this contract, return it.
  SELECT * INTO _new_terms
    FROM public.employee_contract_terms
   WHERE contract_id = _contract_id
   LIMIT 1;
  IF FOUND THEN
    RETURN _new_terms;
  END IF;

  -- Build a key/value map of amendment field changes (new_value per field)
  _changes := '{}'::jsonb;
  IF _amendment.id IS NOT NULL AND jsonb_typeof(_amendment.field_changes) = 'array' THEN
    SELECT COALESCE(
      jsonb_object_agg(elem->>'field', elem->'new_value'),
      '{}'::jsonb
    )
    INTO _changes
    FROM jsonb_array_elements(_amendment.field_changes) elem
    WHERE elem ? 'field';
  END IF;

  -- Resolve each operational field: amendment new_value → contract extracted_data → employee profile
  _hourly_rate    := COALESCE(NULLIF(_changes->>'hourly_rate','')::numeric,
                              NULLIF(_doc.extracted_data->>'hourly_rate','')::numeric,
                              _emp.hourly_rate);
  _annual_salary  := COALESCE(NULLIF(_changes->>'annual_salary','')::numeric,
                              NULLIF(_doc.extracted_data->>'annual_salary','')::numeric,
                              CASE WHEN _emp.pay_type = 'salary' THEN _emp.pay_amount ELSE NULL END);
  _pay_type       := COALESCE(_changes->>'pay_type',
                              _doc.extracted_data->>'pay_type',
                              _emp.pay_type);
  _contracted_hrs := COALESCE(NULLIF(_changes->>'weekly_hours','')::numeric,
                              NULLIF(_changes->>'contracted_hours','')::numeric,
                              NULLIF(_doc.extracted_data->>'weekly_hours','')::numeric,
                              NULLIF(_doc.extracted_data->>'contracted_hours','')::numeric);
  _department     := COALESCE(_changes->>'department',
                              _doc.extracted_data->>'department',
                              _emp.department);
  _role_title     := COALESCE(_changes->>'role',
                              _changes->>'role_title',
                              _doc.extracted_data->>'role',
                              _doc.extracted_data->>'role_title');
  _work_location  := COALESCE(_changes->>'workplace',
                              _changes->>'work_location',
                              _doc.extracted_data->>'workplace',
                              _doc.extracted_data->>'work_location');
  _employment_typ := COALESCE(_changes->>'employment_type',
                              _doc.extracted_data->>'employment_type');
  _probation_end  := COALESCE(NULLIF(_changes->>'probation_end_date','')::date,
                              NULLIF(_doc.extracted_data->>'probation_end_date','')::date);
  _is_apprentice  := COALESCE((_changes->>'is_apprentice')::boolean,
                              (_doc.extracted_data->>'is_apprentice')::boolean,
                              false);
  _svc_eligible   := COALESCE((_changes->>'service_charge_eligible')::boolean,
                              (_doc.extracted_data->>'service_charge_eligible')::boolean,
                              _emp.service_charge_eligible);
  _overtime_model := COALESCE(_changes->>'overtime_model',
                              _doc.extracted_data->>'overtime_model',
                              _emp.overtime_model);
  _holiday_method := COALESCE(_changes->>'holiday_entitlement_method',
                              _doc.extracted_data->>'holiday_entitlement_method',
                              _emp.holiday_entitlement_method);

  -- If activating now, close the current active row (supersede it).
  IF _status = 'active' THEN
    SELECT * INTO _prev_terms
      FROM public.employee_contract_terms
     WHERE employee_id = _doc.employee_id
       AND status = 'active'
       AND effective_from <= _effective_from
       AND (effective_to IS NULL OR effective_to > _effective_from)
     ORDER BY effective_from DESC
     LIMIT 1;

    IF FOUND AND _prev_terms.id IS NOT NULL THEN
      -- Close it: set effective_to first, then flip status to superseded (two updates to satisfy protection trigger)
      UPDATE public.employee_contract_terms
         SET effective_to = _effective_from
       WHERE id = _prev_terms.id;
      UPDATE public.employee_contract_terms
         SET status = 'superseded'
       WHERE id = _prev_terms.id;

      INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
      VALUES ('update'::audit_action, 'employee_contract_terms', _prev_terms.id, _prev_terms.tenant_id,
        jsonb_build_object(
          'event', 'employment_terms_superseded',
          'employee_id', _prev_terms.employee_id,
          'superseded_by_contract_id', _contract_id,
          'effective_to', _effective_from
        ));
    END IF;
  END IF;

  -- Insert the new terms row
  INSERT INTO public.employee_contract_terms (
    tenant_id, employee_id, contract_id, root_contract_id, source_amendment_id,
    version_number, effective_from, status,
    hourly_rate, annual_salary, pay_type, contracted_hours,
    department, role_title, work_location, employment_type,
    is_apprentice, probation_end_date,
    service_charge_eligible, overtime_model, holiday_entitlement_method,
    source_type, created_by
  ) VALUES (
    _doc.tenant_id, _doc.employee_id, _doc.id, _root_id, _amendment.id,
    COALESCE(_doc.version_number, 1), _effective_from, _status,
    _hourly_rate, _annual_salary, _pay_type, _contracted_hrs,
    _department, _role_title, _work_location, _employment_typ,
    _is_apprentice, _probation_end,
    _svc_eligible, _overtime_model, _holiday_method,
    CASE WHEN _amendment.id IS NOT NULL THEN 'amendment' ELSE 'signed_contract' END,
    _doc.uploaded_by
  )
  RETURNING * INTO _new_terms;

  INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
  VALUES ('create'::audit_action, 'employee_contract_terms', _new_terms.id, _new_terms.tenant_id,
    jsonb_build_object(
      'event', CASE WHEN _status='scheduled' THEN 'employment_terms_scheduled' ELSE 'employment_terms_activated_from_contract' END,
      'employee_id', _new_terms.employee_id,
      'contract_id', _contract_id,
      'amendment_id', _amendment.id,
      'effective_from', _effective_from,
      'status', _status,
      'source_type', _new_terms.source_type,
      'fields', jsonb_build_object(
        'hourly_rate', _hourly_rate,
        'annual_salary', _annual_salary,
        'pay_type', _pay_type,
        'contracted_hours', _contracted_hrs,
        'department', _department,
        'role_title', _role_title,
        'work_location', _work_location,
        'employment_type', _employment_typ,
        'probation_end_date', _probation_end
      )
    ));

  RETURN _new_terms;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_contract_terms(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_contract_terms(uuid) TO authenticated, service_role;

-- =============================================================
-- get_scheduled_employment_terms(_employee_id)
-- Returns future-dated terms not yet active.
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_scheduled_employment_terms(_employee_id uuid)
RETURNS SETOF public.employee_contract_terms
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT *
    FROM public.employee_contract_terms
   WHERE employee_id = _employee_id
     AND status = 'scheduled'
     AND effective_from > CURRENT_DATE
   ORDER BY effective_from ASC;
$$;
REVOKE EXECUTE ON FUNCTION public.get_scheduled_employment_terms(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_scheduled_employment_terms(uuid) TO authenticated, service_role;

-- =============================================================
-- activate_scheduled_employment_terms()
-- Flips scheduled rows whose effective_from <= today to active and
-- supersedes the previous active row. Designed for a future cron.
-- =============================================================
CREATE OR REPLACE FUNCTION public.activate_scheduled_employment_terms()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row public.employee_contract_terms%ROWTYPE;
  _prev public.employee_contract_terms%ROWTYPE;
  _count integer := 0;
BEGIN
  FOR _row IN
    SELECT * FROM public.employee_contract_terms
     WHERE status = 'scheduled'
       AND effective_from <= CURRENT_DATE
     ORDER BY effective_from ASC
  LOOP
    SELECT * INTO _prev
      FROM public.employee_contract_terms
     WHERE employee_id = _row.employee_id
       AND status = 'active'
       AND id <> _row.id
       AND effective_from <= _row.effective_from
       AND (effective_to IS NULL OR effective_to > _row.effective_from)
     ORDER BY effective_from DESC LIMIT 1;

    IF FOUND AND _prev.id IS NOT NULL THEN
      UPDATE public.employee_contract_terms SET effective_to = _row.effective_from WHERE id = _prev.id;
      UPDATE public.employee_contract_terms SET status = 'superseded' WHERE id = _prev.id;
      INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
      VALUES ('update'::audit_action, 'employee_contract_terms', _prev.id, _prev.tenant_id,
        jsonb_build_object('event','employment_terms_superseded_by_scheduled','superseded_by', _row.id));
    END IF;

    -- Flip scheduled -> active via protection-trigger-safe path: status only
    -- (protection trigger allows scheduled rows to transition freely; only active/superseded/terminated are locked)
    UPDATE public.employee_contract_terms
       SET status = 'active'
     WHERE id = _row.id;

    INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
    VALUES ('update'::audit_action, 'employee_contract_terms', _row.id, _row.tenant_id,
      jsonb_build_object('event','employment_terms_scheduled_activated','effective_from', _row.effective_from));

    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.activate_scheduled_employment_terms() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_scheduled_employment_terms() TO authenticated, service_role;
