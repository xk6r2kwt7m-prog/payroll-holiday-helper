
-- 1. TRIGGER: Block updates/deletes on payroll_entries when parent period is approved
CREATE OR REPLACE FUNCTION public.protect_approved_payroll_entries()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _period_status text;
BEGIN
  -- For DELETE, use OLD; for UPDATE, use NEW (period_id doesn't change)
  SELECT status INTO _period_status
  FROM public.payroll_periods
  WHERE id = COALESCE(OLD.payroll_period_id, NEW.payroll_period_id);

  IF _period_status = 'approved' THEN
    RAISE EXCEPTION 'This payroll period is locked and cannot be edited. Reopen the period first.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_approved_payroll_entries
BEFORE UPDATE OR DELETE ON public.payroll_entries
FOR EACH ROW
EXECUTE FUNCTION public.protect_approved_payroll_entries();

-- 2. TRIGGER: Block updates/deletes on payroll_periods when approved (except status change to draft via reopen)
CREATE OR REPLACE FUNCTION public.protect_approved_payroll_periods()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;

CREATE TRIGGER trg_protect_approved_payroll_periods
BEFORE UPDATE OR DELETE ON public.payroll_periods
FOR EACH ROW
EXECUTE FUNCTION public.protect_approved_payroll_periods();

-- 3. TRIGGER: Block updates/deletes on holiday_payments when parent period is approved
CREATE OR REPLACE FUNCTION public.protect_approved_holiday_payments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _period_status text;
BEGIN
  SELECT status INTO _period_status
  FROM public.payroll_periods
  WHERE id = COALESCE(OLD.payroll_period_id, NEW.payroll_period_id);

  IF _period_status = 'approved' THEN
    RAISE EXCEPTION 'This payroll period is locked and cannot be edited. Reopen the period first.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_approved_holiday_payments
BEFORE UPDATE OR DELETE ON public.holiday_payments
FOR EACH ROW
EXECUTE FUNCTION public.protect_approved_holiday_payments();

-- 4. TRIGGER: Auto-recalculate payroll_periods totals when entries change
CREATE OR REPLACE FUNCTION public.sync_payroll_period_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;

CREATE TRIGGER trg_sync_payroll_period_totals
AFTER INSERT OR UPDATE OR DELETE ON public.payroll_entries
FOR EACH ROW
EXECUTE FUNCTION public.sync_payroll_period_totals();
