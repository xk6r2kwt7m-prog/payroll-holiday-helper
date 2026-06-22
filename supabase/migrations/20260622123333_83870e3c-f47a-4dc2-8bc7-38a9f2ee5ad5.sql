
-- Guardrails G2 + G3
-- G2: validate employees.date_of_birth (must be in the past and at least 14 years ago)
-- G3: require a non-empty note on a payroll_adjustment whose linked entry has 0 hours
--     and a non-zero new value.

-- ---------------------------------------------------------------------------
-- G2 — DOB validation trigger (CHECK cannot reference CURRENT_DATE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_employee_dob()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    IF NEW.date_of_birth > CURRENT_DATE THEN
      RAISE EXCEPTION 'Date of birth cannot be in the future (got %)', NEW.date_of_birth
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.date_of_birth > CURRENT_DATE - INTERVAL '14 years' THEN
      RAISE EXCEPTION 'Date of birth must be at least 14 years ago (got %). Employees under 14 cannot be added.', NEW.date_of_birth
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_employee_dob ON public.employees;
CREATE TRIGGER trg_validate_employee_dob
BEFORE INSERT OR UPDATE OF date_of_birth ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.validate_employee_dob();

-- ---------------------------------------------------------------------------
-- G3 — Payroll adjustment note requirement
-- If the adjustment carries a non-zero new_value AND the linked payroll_entry
-- has 0 timesheet_hours, a non-empty note is mandatory.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_payroll_adjustment_note()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_hours numeric;
BEGIN
  IF COALESCE(NEW.new_value, 0) <> 0 THEN
    SELECT COALESCE(timesheet_hours, 0) INTO v_hours
      FROM public.payroll_entries
     WHERE id = NEW.payroll_entry_id;

    IF COALESCE(v_hours, 0) = 0 AND (NEW.note IS NULL OR length(btrim(NEW.note)) = 0) THEN
      RAISE EXCEPTION 'A note is required for a non-zero adjustment on a zero-hour entry (field: %, value: %).',
        NEW.field_name, NEW.new_value
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payroll_adjustment_note ON public.payroll_adjustments;
CREATE TRIGGER trg_validate_payroll_adjustment_note
BEFORE INSERT OR UPDATE ON public.payroll_adjustments
FOR EACH ROW EXECUTE FUNCTION public.validate_payroll_adjustment_note();

COMMENT ON FUNCTION public.validate_employee_dob() IS
  'Guardrail G2 — rejects future DOB or DOB younger than 14 years. Forward-looking only; existing rows are NOT modified.';
COMMENT ON FUNCTION public.validate_payroll_adjustment_note() IS
  'Guardrail G3 — requires a non-empty note when a payroll adjustment posts a non-zero value to an entry with 0 hours.';
