-- HELD — NOT APPROVED. Release H2 (calculation change). Install only after H1 and explicit approval.
-- Changes the payroll_entries trigger so grand_total = timesheet_total + holidays_total on every change.
BEGIN;
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

DROP FUNCTION IF EXISTS public.sync_holiday_payment_totals_current_rule();
COMMIT;
