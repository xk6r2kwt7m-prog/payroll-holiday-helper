-- Review before applying. Existing rows are retained unchanged.
BEGIN;
ALTER TABLE public.right_to_work_checks
  DROP CONSTRAINT IF EXISTS right_to_work_checks_check_method_check,
  DROP CONSTRAINT IF EXISTS right_to_work_checks_result_check;
ALTER TABLE public.right_to_work_checks
  ADD CONSTRAINT right_to_work_checks_check_method_check CHECK
    (check_method IN ('online_share_code','manual_document','digital_id_provider','employer_checking_service')),
  ADD CONSTRAINT right_to_work_checks_result_check CHECK
    (result IN ('unlimited','time_limited','no_right_to_work','ecs_pending')),
  ADD COLUMN IF NOT EXISTS is_student boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_dates text,
  ADD COLUMN IF NOT EXISTS student_evidence_document_id uuid REFERENCES public.employee_documents(id);

-- Enforce ownership and evidence on every future insert, including direct API
-- calls. No backfill or reinterpretation of historical checks.
CREATE OR REPLACE FUNCTION public.validate_right_to_work_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.employees e
      WHERE e.id = NEW.employee_id AND e.tenant_id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'Employee and check must belong to the same workspace' USING ERRCODE = '23514';
  END IF;
  IF auth.uid() IS NOT NULL AND (
      NEW.checked_by IS DISTINCT FROM auth.uid()
      OR NOT public.is_tenant_manager_or_above(NEW.tenant_id)
      OR NOT public.can_view_employee(NEW.employee_id)) THEN
    RAISE EXCEPTION 'Not authorised to record this check' USING ERRCODE = '42501';
  END IF;
  IF NEW.checked_on > CURRENT_DATE THEN RAISE EXCEPTION 'Check date cannot be in the future'; END IF;
  IF NEW.result = 'ecs_pending' THEN
    IF NEW.check_method <> 'employer_checking_service' OR nullif(btrim(NEW.notes), '') IS NULL THEN
      RAISE EXCEPTION 'Pending ECS checks require an ECS method and a case note';
    END IF;
  ELSIF NEW.evidence_document_id IS NULL THEN
    RAISE EXCEPTION 'A completed check requires evidence';
  END IF;
  IF NEW.evidence_document_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.employee_documents d WHERE d.id = NEW.evidence_document_id
      AND d.employee_id = NEW.employee_id AND d.tenant_id = NEW.tenant_id
      AND nullif(btrim(d.file_path), '') IS NOT NULL) THEN
    RAISE EXCEPTION 'Evidence must belong to this employee and workspace';
  END IF;
  IF NEW.result = 'time_limited' AND NEW.permission_expires_on < NEW.checked_on THEN
    RAISE EXCEPTION 'Permission cannot expire before the check date';
  END IF;
  IF NEW.is_student AND NEW.result IN ('unlimited','time_limited') THEN
    IF nullif(btrim(NEW.study_dates), '') IS NULL OR nullif(btrim(NEW.work_restrictions), '') IS NULL
       OR NEW.student_evidence_document_id IS NULL THEN
      RAISE EXCEPTION 'Student clearance requires study dates, restrictions and course evidence';
    END IF;
  END IF;
  IF NEW.student_evidence_document_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.employee_documents d WHERE d.id = NEW.student_evidence_document_id
      AND d.employee_id = NEW.employee_id AND d.tenant_id = NEW.tenant_id
      AND nullif(btrim(d.file_path), '') IS NOT NULL) THEN
    RAISE EXCEPTION 'Student evidence must belong to this employee and workspace';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_right_to_work_check() FROM PUBLIC;
CREATE TRIGGER validate_right_to_work_check_before_insert
BEFORE INSERT ON public.right_to_work_checks
FOR EACH ROW EXECUTE FUNCTION public.validate_right_to_work_check();

DROP POLICY "Managers can insert their own RTW checks" ON public.right_to_work_checks;
CREATE POLICY "Managers can insert their own RTW checks" ON public.right_to_work_checks
FOR INSERT TO authenticated WITH CHECK (
  public.is_tenant_manager_or_above(tenant_id) AND checked_by = auth.uid()
  AND public.can_view_employee(employee_id)
  AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.tenant_id = right_to_work_checks.tenant_id)
);
COMMIT;
