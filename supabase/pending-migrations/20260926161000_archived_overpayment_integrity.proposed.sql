-- PROPOSED ONLY. Install with B immediately after 20260926150000. Archives no period.
-- Preserve original overpayment amounts/identity while allowing the existing recovery fields.
BEGIN;
CREATE OR REPLACE FUNCTION public.guard_archived_payroll_overpayment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP IN ('INSERT','DELETE') THEN
    IF public.is_payroll_period_archived(CASE WHEN TG_OP = 'INSERT' THEN NEW.payroll_period_id ELSE OLD.payroll_period_id END)
       OR (TG_OP = 'INSERT' AND public.is_payroll_period_archived(NEW.recovered_in_period_id)) THEN
      RAISE EXCEPTION 'This payroll period is archived and read-only. Nothing was changed.' USING ERRCODE = '55000';
    END IF;
  ELSIF (NEW.payroll_period_id IS DISTINCT FROM OLD.payroll_period_id
          AND (public.is_payroll_period_archived(OLD.payroll_period_id) OR public.is_payroll_period_archived(NEW.payroll_period_id)))
     OR (NEW.recovered_in_period_id IS DISTINCT FROM OLD.recovered_in_period_id
          AND (public.is_payroll_period_archived(OLD.recovered_in_period_id) OR public.is_payroll_period_archived(NEW.recovered_in_period_id))) THEN
    RAISE EXCEPTION 'This payroll period is archived and read-only. Nothing was changed.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'UPDATE' AND public.is_payroll_period_archived(OLD.payroll_period_id) THEN
    -- Preserve the original debt and ownership. Only the subsequent recovery bookkeeping
    -- may change; new columns are protected by default rather than silently editable.
    IF (to_jsonb(NEW) - ARRAY['recovered_amount','recovered_in_period_id','recovery_method','recovery_status','updated_at'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['recovered_amount','recovered_in_period_id','recovery_method','recovery_status','updated_at']) THEN
      RAISE EXCEPTION 'The original archived overpayment is read-only. Only recovery details may change.' USING ERRCODE='55000';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
COMMIT;
