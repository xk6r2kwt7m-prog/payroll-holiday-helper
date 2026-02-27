-- Trigger function to prevent overlapping payroll periods
CREATE OR REPLACE FUNCTION public.prevent_payroll_period_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  overlapping_period RECORD;
BEGIN
  SELECT id, period_name, start_date, end_date
  INTO overlapping_period
  FROM public.payroll_periods
  WHERE id != NEW.id
    AND daterange(start_date, end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]');

  IF FOUND THEN
    RAISE EXCEPTION 'Payroll period "%" (% to %) overlaps with existing period "%" (% to %). Overlapping dates are not allowed.',
      NEW.period_name, NEW.start_date, NEW.end_date,
      overlapping_period.period_name, overlapping_period.start_date, overlapping_period.end_date;
  END IF;

  RETURN NEW;
END;
$function$;

-- Apply trigger on INSERT and UPDATE
CREATE TRIGGER check_payroll_period_overlap
BEFORE INSERT OR UPDATE OF start_date, end_date ON public.payroll_periods
FOR EACH ROW
EXECUTE FUNCTION public.prevent_payroll_period_overlap();
