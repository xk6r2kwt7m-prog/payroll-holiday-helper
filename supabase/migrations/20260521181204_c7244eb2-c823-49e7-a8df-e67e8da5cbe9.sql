
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.employee_contract_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.employee_documents(id) ON DELETE SET NULL,
  root_contract_id uuid REFERENCES public.employee_documents(id) ON DELETE SET NULL,
  source_amendment_id uuid REFERENCES public.contract_amendments(id) ON DELETE SET NULL,
  version_number integer NOT NULL DEFAULT 1,
  effective_from date NOT NULL,
  effective_to date,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','scheduled','active','superseded','terminated')),
  hourly_rate numeric(10,4),
  annual_salary numeric(12,2),
  pay_type text,
  contracted_hours numeric(6,2),
  contracted_hours_basis text,
  department text,
  role_title text,
  work_location text,
  employment_type text,
  is_apprentice boolean DEFAULT false,
  probation_end_date date,
  notice_period_weeks integer,
  overtime_model text,
  holiday_entitlement_method text,
  service_charge_eligible boolean,
  source_type text NOT NULL
    CHECK (source_type IN ('backfill_from_employee_profile','signed_contract','amendment','manual_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX uq_employee_contract_terms_eff
  ON public.employee_contract_terms(employee_id, effective_from);
CREATE INDEX idx_ect_tenant ON public.employee_contract_terms(tenant_id);
CREATE INDEX idx_ect_employee ON public.employee_contract_terms(employee_id);
CREATE INDEX idx_ect_status ON public.employee_contract_terms(status);
CREATE INDEX idx_ect_contract ON public.employee_contract_terms(contract_id);

ALTER TABLE public.employee_contract_terms
  ADD CONSTRAINT no_overlap_active_terms EXCLUDE USING gist (
    employee_id WITH =,
    daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[)') WITH &&
  ) WHERE (status = 'active');

CREATE TRIGGER trg_ect_updated_at
  BEFORE UPDATE ON public.employee_contract_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.protect_employment_terms()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('active','superseded','terminated') THEN
      RAISE EXCEPTION 'Employment terms (status=%) are immutable and cannot be deleted. Supersede instead.', OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status IN ('superseded','terminated') THEN
    RAISE EXCEPTION 'Employment terms row is % and is read-only.', OLD.status;
  END IF;

  IF OLD.status = 'active' THEN
    IF NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
       OR NEW.annual_salary IS DISTINCT FROM OLD.annual_salary
       OR NEW.contracted_hours IS DISTINCT FROM OLD.contracted_hours
       OR NEW.department IS DISTINCT FROM OLD.department
       OR NEW.role_title IS DISTINCT FROM OLD.role_title
       OR NEW.work_location IS DISTINCT FROM OLD.work_location
       OR NEW.employment_type IS DISTINCT FROM OLD.employment_type
       OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
       OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'Active employment terms are immutable. Create a new row (amendment) instead.';
    END IF;
    IF NEW.status NOT IN ('active','superseded','terminated') THEN
      RAISE EXCEPTION 'Invalid status transition from active to %', NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_employment_terms
  BEFORE UPDATE OR DELETE ON public.employee_contract_terms
  FOR EACH ROW EXECUTE FUNCTION public.protect_employment_terms();

ALTER TABLE public.employee_contract_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view employment terms"
ON public.employee_contract_terms FOR SELECT
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant managers can insert employment terms"
ON public.employee_contract_terms FOR INSERT
WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant managers can update employment terms"
ON public.employee_contract_terms FOR UPDATE
USING (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant admins can delete draft employment terms"
ON public.employee_contract_terms FOR DELETE
USING (public.is_tenant_admin(tenant_id) AND status = 'draft');

CREATE OR REPLACE FUNCTION public.get_active_employment_terms(_employee_id uuid, _as_of date DEFAULT CURRENT_DATE)
RETURNS public.employee_contract_terms
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT *
  FROM public.employee_contract_terms
  WHERE employee_id = _employee_id
    AND status = 'active'
    AND effective_from <= _as_of
    AND (effective_to IS NULL OR effective_to > _as_of)
  ORDER BY effective_from DESC
  LIMIT 1;
$$;

INSERT INTO public.employee_contract_terms (
  tenant_id, employee_id, version_number, effective_from, status,
  hourly_rate, annual_salary, pay_type, department, source_type
)
SELECT
  e.tenant_id,
  e.id,
  1,
  COALESCE(e.start_date, e.created_at::date, CURRENT_DATE),
  'active',
  e.hourly_rate,
  CASE WHEN e.pay_type = 'salary' THEN e.pay_amount ELSE NULL END,
  e.pay_type,
  e.department,
  'backfill_from_employee_profile'
FROM public.employees e
WHERE NOT EXISTS (
  SELECT 1 FROM public.employee_contract_terms t
  WHERE t.employee_id = e.id AND t.status = 'active'
)
ON CONFLICT (employee_id, effective_from) DO NOTHING;

INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
SELECT
  'create'::audit_action,
  'employee_contract_terms',
  t.id,
  t.tenant_id,
  jsonb_build_object(
    'event', 'employment_terms_backfilled',
    'employee_id', t.employee_id,
    'source_type', t.source_type,
    'effective_from', t.effective_from,
    'hourly_rate', t.hourly_rate,
    'annual_salary', t.annual_salary,
    'pay_type', t.pay_type,
    'department', t.department,
    'note', 'Backfilled from employees profile. Not derived from a signed contract.'
  )
FROM public.employee_contract_terms t
WHERE t.source_type = 'backfill_from_employee_profile';
