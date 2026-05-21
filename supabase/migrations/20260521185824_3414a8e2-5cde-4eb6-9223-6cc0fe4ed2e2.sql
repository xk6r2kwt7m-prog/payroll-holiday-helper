
-- Phase 3: Service charge structure on employee_contract_terms, and contract NMW override audit

ALTER TABLE public.employee_contract_terms
  ADD COLUMN IF NOT EXISTS base_hourly_rate numeric(10,4),
  ADD COLUMN IF NOT EXISTS guaranteed_service_charge_rate numeric(10,4),
  ADD COLUMN IF NOT EXISTS estimated_service_charge_rate numeric(10,4),
  ADD COLUMN IF NOT EXISTS actual_service_charge_paid numeric(10,4),
  ADD COLUMN IF NOT EXISTS tronc_scheme_name text,
  ADD COLUMN IF NOT EXISTS service_charge_policy_note text;

COMMENT ON COLUMN public.employee_contract_terms.base_hourly_rate IS
  'Legal basic hourly rate used for UK National Minimum Wage compliance. Service charge, tips, tronc must NEVER be included here.';
COMMENT ON COLUMN public.employee_contract_terms.guaranteed_service_charge_rate IS
  'Contractually guaranteed service-charge supplement per hour. Separate pay component, NOT counted toward NMW.';
COMMENT ON COLUMN public.employee_contract_terms.estimated_service_charge_rate IS
  'Estimated (non-guaranteed) service-charge supplement per hour, for package-display purposes only.';

-- Backfill base_hourly_rate from legacy hourly_rate
UPDATE public.employee_contract_terms
   SET base_hourly_rate = hourly_rate
 WHERE base_hourly_rate IS NULL
   AND hourly_rate IS NOT NULL;

-- Contract NMW override audit (separate, dedicated, tamper-evident table)
CREATE TABLE IF NOT EXISTS public.contract_minimum_wage_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.employee_documents(id) ON DELETE SET NULL,
  base_hourly_rate numeric(10,4) NOT NULL,
  required_minimum_rate numeric(10,4) NOT NULL,
  age_band text,
  override_reason text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cmwo_tenant ON public.contract_minimum_wage_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cmwo_employee ON public.contract_minimum_wage_overrides(employee_id);

ALTER TABLE public.contract_minimum_wage_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view contract NMW overrides"
  ON public.contract_minimum_wage_overrides FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Tenant managers can insert contract NMW overrides"
  ON public.contract_minimum_wage_overrides FOR INSERT
  WITH CHECK (is_tenant_manager_or_above(tenant_id));

-- Immutable: no UPDATE/DELETE policies on purpose.

-- Update activate_contract_terms to populate the new SC + base rate columns.
CREATE OR REPLACE FUNCTION public.activate_contract_terms(_contract_id uuid)
 RETURNS employee_contract_terms
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _base_rate      numeric;
  _guaranteed_sc  numeric;
  _estimated_sc   numeric;
  _tronc_scheme   text;
  _sc_policy_note text;
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract % not found', _contract_id; END IF;
  IF _doc.document_type::text <> 'contract' THEN
    RAISE EXCEPTION 'Document % is not a contract', _contract_id;
  END IF;
  IF COALESCE(_doc.contract_state,'') <> 'signed' THEN
    RAISE EXCEPTION 'Contract % is not in signed state (state=%)', _contract_id, _doc.contract_state;
  END IF;

  SELECT * INTO _emp FROM public.employees WHERE id = _doc.employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employee % not found', _doc.employee_id; END IF;

  SELECT * INTO _amendment FROM public.contract_amendments
   WHERE new_contract_id = _contract_id LIMIT 1;

  _root_id := COALESCE(_doc.root_contract_id, _doc.id);
  _effective_from := COALESCE(_doc.effective_date, _amendment.effective_date, _emp.start_date, _today);
  _status := CASE WHEN _effective_from <= _today THEN 'active' ELSE 'scheduled' END;

  SELECT * INTO _new_terms FROM public.employee_contract_terms WHERE contract_id = _contract_id LIMIT 1;
  IF FOUND THEN RETURN _new_terms; END IF;

  _changes := '{}'::jsonb;
  IF _amendment.id IS NOT NULL AND jsonb_typeof(_amendment.field_changes) = 'array' THEN
    SELECT COALESCE(jsonb_object_agg(elem->>'field', elem->'new_value'),'{}'::jsonb)
      INTO _changes
      FROM jsonb_array_elements(_amendment.field_changes) elem
     WHERE elem ? 'field';
  END IF;

  _hourly_rate    := COALESCE(NULLIF(_changes->>'hourly_rate','')::numeric,
                              NULLIF(_doc.extracted_data->>'hourly_rate','')::numeric,
                              _emp.hourly_rate);
  -- base_hourly_rate: prefer explicit base_hourly_rate from amendment/contract; fall back to hourly_rate.
  _base_rate      := COALESCE(NULLIF(_changes->>'base_hourly_rate','')::numeric,
                              NULLIF(_doc.extracted_data->>'base_hourly_rate','')::numeric,
                              _hourly_rate);
  _guaranteed_sc  := COALESCE(NULLIF(_changes->>'guaranteed_service_charge_rate','')::numeric,
                              NULLIF(_doc.extracted_data->>'guaranteed_service_charge_rate','')::numeric);
  _estimated_sc   := COALESCE(NULLIF(_changes->>'estimated_service_charge_rate','')::numeric,
                              NULLIF(_doc.extracted_data->>'estimated_service_charge_rate','')::numeric);
  _tronc_scheme   := COALESCE(_changes->>'tronc_scheme_name', _doc.extracted_data->>'tronc_scheme_name');
  _sc_policy_note := COALESCE(_changes->>'service_charge_policy_note', _doc.extracted_data->>'service_charge_policy_note');
  _annual_salary  := COALESCE(NULLIF(_changes->>'annual_salary','')::numeric,
                              NULLIF(_doc.extracted_data->>'annual_salary','')::numeric,
                              CASE WHEN _emp.pay_type = 'salary' THEN _emp.pay_amount ELSE NULL END);
  _pay_type       := COALESCE(_changes->>'pay_type', _doc.extracted_data->>'pay_type', _emp.pay_type);
  _contracted_hrs := COALESCE(NULLIF(_changes->>'weekly_hours','')::numeric,
                              NULLIF(_changes->>'contracted_hours','')::numeric,
                              NULLIF(_doc.extracted_data->>'weekly_hours','')::numeric,
                              NULLIF(_doc.extracted_data->>'contracted_hours','')::numeric);
  _department     := COALESCE(_changes->>'department', _doc.extracted_data->>'department', _emp.department);
  _role_title     := COALESCE(_changes->>'role', _changes->>'role_title',
                              _doc.extracted_data->>'role', _doc.extracted_data->>'role_title');
  _work_location  := COALESCE(_changes->>'workplace', _changes->>'work_location',
                              _doc.extracted_data->>'workplace', _doc.extracted_data->>'work_location');
  _employment_typ := COALESCE(_changes->>'employment_type', _doc.extracted_data->>'employment_type');
  _probation_end  := COALESCE(NULLIF(_changes->>'probation_end_date','')::date,
                              NULLIF(_doc.extracted_data->>'probation_end_date','')::date);
  _is_apprentice  := COALESCE((_changes->>'is_apprentice')::boolean,
                              (_doc.extracted_data->>'is_apprentice')::boolean, false);
  _svc_eligible   := COALESCE((_changes->>'service_charge_eligible')::boolean,
                              (_doc.extracted_data->>'service_charge_eligible')::boolean,
                              _emp.service_charge_eligible);
  _overtime_model := COALESCE(_changes->>'overtime_model', _doc.extracted_data->>'overtime_model', _emp.overtime_model);
  _holiday_method := COALESCE(_changes->>'holiday_entitlement_method', _doc.extracted_data->>'holiday_entitlement_method', _emp.holiday_entitlement_method);

  IF _status = 'active' THEN
    SELECT * INTO _prev_terms FROM public.employee_contract_terms
     WHERE employee_id = _doc.employee_id AND status = 'active'
       AND effective_from <= _effective_from
       AND (effective_to IS NULL OR effective_to > _effective_from)
     ORDER BY effective_from DESC LIMIT 1;
    IF FOUND AND _prev_terms.id IS NOT NULL THEN
      UPDATE public.employee_contract_terms SET effective_to = _effective_from WHERE id = _prev_terms.id;
      UPDATE public.employee_contract_terms SET status = 'superseded' WHERE id = _prev_terms.id;
      INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
      VALUES ('update'::audit_action, 'employee_contract_terms', _prev_terms.id, _prev_terms.tenant_id,
        jsonb_build_object('event','employment_terms_superseded',
                           'employee_id', _prev_terms.employee_id,
                           'superseded_by_contract_id', _contract_id,
                           'effective_to', _effective_from));
    END IF;
  END IF;

  INSERT INTO public.employee_contract_terms (
    tenant_id, employee_id, contract_id, root_contract_id, source_amendment_id,
    version_number, effective_from, status,
    hourly_rate, base_hourly_rate,
    guaranteed_service_charge_rate, estimated_service_charge_rate,
    tronc_scheme_name, service_charge_policy_note,
    annual_salary, pay_type, contracted_hours,
    department, role_title, work_location, employment_type,
    is_apprentice, probation_end_date,
    service_charge_eligible, overtime_model, holiday_entitlement_method,
    source_type, created_by
  ) VALUES (
    _doc.tenant_id, _doc.employee_id, _doc.id, _root_id, _amendment.id,
    COALESCE(_doc.version_number, 1), _effective_from, _status,
    _hourly_rate, _base_rate,
    _guaranteed_sc, _estimated_sc,
    _tronc_scheme, _sc_policy_note,
    _annual_salary, _pay_type, _contracted_hrs,
    _department, _role_title, _work_location, _employment_typ,
    _is_apprentice, _probation_end,
    _svc_eligible, _overtime_model, _holiday_method,
    CASE WHEN _amendment.id IS NOT NULL THEN 'amendment' ELSE 'signed_contract' END,
    _doc.uploaded_by
  ) RETURNING * INTO _new_terms;

  INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
  VALUES ('create'::audit_action, 'employee_contract_terms', _new_terms.id, _new_terms.tenant_id,
    jsonb_build_object(
      'event', CASE WHEN _status='scheduled' THEN 'employment_terms_scheduled' ELSE 'employment_terms_activated_from_contract' END,
      'employee_id', _new_terms.employee_id,
      'contract_id', _contract_id, 'amendment_id', _amendment.id,
      'effective_from', _effective_from, 'status', _status,
      'source_type', _new_terms.source_type,
      'fields', jsonb_build_object(
        'hourly_rate', _hourly_rate,
        'base_hourly_rate', _base_rate,
        'guaranteed_service_charge_rate', _guaranteed_sc,
        'estimated_service_charge_rate', _estimated_sc,
        'department', _department,
        'role_title', _role_title,
        'employment_type', _employment_typ
      )
    ));

  RETURN _new_terms;
END;
$function$;
