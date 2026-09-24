CREATE TABLE public.right_to_work_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  check_method text NOT NULL CHECK (check_method IN ('online_share_code', 'manual_document', 'digital_id_provider')),
  checked_on date NOT NULL,
  checked_by uuid NOT NULL,
  checked_by_name text,
  result text NOT NULL CHECK (result IN ('unlimited', 'time_limited', 'no_right_to_work')),
  permission_expires_on date,
  work_restrictions text,
  evidence_document_id uuid REFERENCES public.employee_documents(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rtw_checks_permission_expiry_required
    CHECK (result <> 'time_limited' OR permission_expires_on IS NOT NULL),
  CONSTRAINT rtw_checks_permission_expiry_only_time_limited
    CHECK (result = 'time_limited' OR permission_expires_on IS NULL)
);

GRANT SELECT, INSERT ON public.right_to_work_checks TO authenticated;
GRANT ALL ON public.right_to_work_checks TO service_role;

ALTER TABLE public.right_to_work_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can insert their own RTW checks"
ON public.right_to_work_checks
FOR INSERT
TO authenticated
WITH CHECK (
  is_tenant_manager_or_above(tenant_id)
  AND checked_by = auth.uid()
);

CREATE POLICY "Admins and scoped managers can view RTW checks"
ON public.right_to_work_checks
FOR SELECT
TO authenticated
USING (
  is_tenant_admin(tenant_id)
  OR (is_tenant_manager_or_above(tenant_id) AND can_view_employee(employee_id))
);

-- No UPDATE or DELETE policies: records are permanent.

CREATE INDEX right_to_work_checks_tenant_employee_date_idx
ON public.right_to_work_checks (tenant_id, employee_id, checked_on);

-- checked_on must not be in the future: time-dependent, so enforced by trigger, not CHECK.
CREATE OR REPLACE FUNCTION public.right_to_work_checks_checked_on_not_future()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.checked_on > CURRENT_DATE THEN
    RAISE EXCEPTION 'checked_on cannot be in the future';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER right_to_work_checks_checked_on_not_future_trg
BEFORE INSERT ON public.right_to_work_checks
FOR EACH ROW
EXECUTE FUNCTION public.right_to_work_checks_checked_on_not_future();