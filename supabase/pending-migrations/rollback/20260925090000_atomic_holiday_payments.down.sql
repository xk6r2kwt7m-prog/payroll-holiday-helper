-- ROLLBACK for 20260925090000_atomic_holiday_payments (review only; not applied).
-- Restores the pre-change live definitions (read from the live database on 26 Sep 2026).
-- Keeps every holiday payment, ledger entry, audit row and the private retry receipts
-- (holiday_payment_operations stays, locked, as evidence). Period totals are NOT recalculated:
-- after rollback, the next payroll-entry change recalculates grand_total as timesheet only (the old rule).
-- Coordinate with the app: the current app saves holiday payments only through the new action,
-- so after this rollback those saves fail until an app version with direct writes is restored.
BEGIN;

DROP POLICY IF EXISTS holiday_payment_ledger_insert_guard ON public.holiday_ledger;
DROP POLICY IF EXISTS holiday_payment_ledger_update_guard ON public.holiday_ledger;
DROP POLICY IF EXISTS holiday_payment_ledger_delete_guard ON public.holiday_ledger;

DROP FUNCTION IF EXISTS public.mutate_holiday_payment_atomic(uuid, uuid, text, uuid, jsonb);

DROP TRIGGER IF EXISTS trg_sync_holiday_payment_totals ON public.holiday_payments;

DROP TRIGGER IF EXISTS trg_protect_approved_payroll_entries ON public.payroll_entries;
CREATE TRIGGER trg_protect_approved_payroll_entries BEFORE DELETE OR UPDATE
  ON public.payroll_entries FOR EACH ROW EXECUTE FUNCTION public.protect_approved_payroll_entries();
DROP TRIGGER IF EXISTS trg_protect_approved_holiday_payments ON public.holiday_payments;
CREATE TRIGGER trg_protect_approved_holiday_payments BEFORE DELETE OR UPDATE
  ON public.holiday_payments FOR EACH ROW EXECUTE FUNCTION public.protect_approved_holiday_payments();
DROP FUNCTION IF EXISTS public.guard_payroll_child_write();

CREATE OR REPLACE FUNCTION public.sync_payroll_period_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _period_id uuid;
  _timesheet_total numeric;
  _grand_total numeric;
BEGIN
  -- Determine which period to update
  IF TG_OP = 'DELETE' THEN
    _period_id := OLD.payroll_period_id;
  ELSE
    _period_id := NEW.payroll_period_id;
  END IF;

  -- Recalculate from all entries
  SELECT
    COALESCE(SUM(total_pay), 0)
  INTO _timesheet_total
  FROM public.payroll_entries
  WHERE payroll_period_id = _period_id;

  _grand_total := _timesheet_total;

  -- Update period totals (this won't trigger the lock because status isn't approved when entries are being modified)
  UPDATE public.payroll_periods
  SET timesheet_total = _timesheet_total,
      grand_total = _grand_total
  WHERE id = _period_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
ALTER FUNCTION public.sync_payroll_period_totals() SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.protect_approved_payroll_periods()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'approved' THEN
      RAISE EXCEPTION 'This payroll period is locked and cannot be deleted. Reopen it first.';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: allow status change from approved to draft (reopen), block everything else
  IF OLD.status = 'approved' THEN
    -- Allow only the reopen action: status changing to draft, clearing approved_by/approved_at
    IF NEW.status = 'draft' AND NEW.approved_by IS NULL AND NEW.approved_at IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'This payroll period is locked and cannot be edited. Reopen the period first.';
  END IF;

  RETURN NEW;
END;
$function$;
ALTER FUNCTION public.protect_approved_payroll_periods() SET search_path TO 'public';

-- Live grants before the change: full table access for anon/authenticated, RLS as the gate.
GRANT INSERT, UPDATE, DELETE ON public.holiday_payments TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_payroll_period_totals() TO PUBLIC;

COMMIT;
