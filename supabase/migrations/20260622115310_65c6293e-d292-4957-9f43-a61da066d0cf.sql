
-- Prevention: automatically write an `accrual` ledger row whenever a payroll_entry
-- belongs to (or transitions to) an approved period, so no future payroll period
-- can be approved without its accruals landing in holiday_ledger.

CREATE OR REPLACE FUNCTION public.ensure_accrual_ledger_for_entry(_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
  v_period RECORD;
  v_leave_year_start date;
BEGIN
  SELECT * INTO v_entry FROM public.payroll_entries WHERE id = _entry_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF COALESCE(v_entry.holiday_accrued_hours, 0) <= 0 THEN RETURN; END IF;

  SELECT * INTO v_period FROM public.payroll_periods WHERE id = v_entry.payroll_period_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF LOWER(COALESCE(v_period.status, '')) NOT IN ('approved','finalised','finalized') THEN RETURN; END IF;

  v_leave_year_start := make_date(EXTRACT(YEAR FROM v_period.start_date)::int, 1, 1);

  INSERT INTO public.holiday_ledger
    (employee_id, tenant_id, leave_year_start, entry_date, entry_type,
     hours, amount, source_table, source_id, notes, created_by)
  VALUES
    (v_entry.employee_id, v_entry.tenant_id, v_leave_year_start, v_period.end_date, 'accrual',
     v_entry.holiday_accrued_hours, NULL, 'payroll_entries', v_entry.id,
     'Auto-generated on payroll period approval', NULL)
  ON CONFLICT ON CONSTRAINT uq_holiday_ledger_source DO NOTHING;
END;
$$;

-- Trigger A: when an entry is inserted/updated and its parent period is already approved.
CREATE OR REPLACE FUNCTION public.trg_payroll_entry_accrual_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_accrual_ledger_for_entry(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payroll_entry_accrual_ledger ON public.payroll_entries;
CREATE TRIGGER payroll_entry_accrual_ledger
AFTER INSERT OR UPDATE OF holiday_accrued_hours, payroll_period_id
ON public.payroll_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_payroll_entry_accrual_ledger();

-- Trigger B: when a period transitions to approved, replay every entry it contains.
CREATE OR REPLACE FUNCTION public.trg_payroll_period_approved_accrual_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id uuid;
BEGIN
  IF LOWER(COALESCE(NEW.status,'')) IN ('approved','finalised','finalized')
     AND LOWER(COALESCE(OLD.status,'')) NOT IN ('approved','finalised','finalized') THEN
    FOR v_entry_id IN SELECT id FROM public.payroll_entries WHERE payroll_period_id = NEW.id LOOP
      PERFORM public.ensure_accrual_ledger_for_entry(v_entry_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payroll_period_approved_accrual_ledger ON public.payroll_periods;
CREATE TRIGGER payroll_period_approved_accrual_ledger
AFTER UPDATE OF status ON public.payroll_periods
FOR EACH ROW EXECUTE FUNCTION public.trg_payroll_period_approved_accrual_ledger();
