-- Create function to auto-populate leave year from holiday taken date
CREATE OR REPLACE FUNCTION public.set_leave_year_from_holiday_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- If holiday_taken_date is set and leave year fields are not manually set
  IF NEW.holiday_taken_date IS NOT NULL THEN
    -- Auto-populate leave year based on calendar year of the holiday taken date
    -- Leave year runs Jan 1 to Dec 31
    NEW.leave_year_start := date_trunc('year', NEW.holiday_taken_date)::date;
    NEW.leave_year_end := (date_trunc('year', NEW.holiday_taken_date) + interval '1 year' - interval '1 day')::date;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT
CREATE TRIGGER set_leave_year_on_insert
BEFORE INSERT ON public.holiday_payments
FOR EACH ROW
EXECUTE FUNCTION public.set_leave_year_from_holiday_date();

-- Create trigger for UPDATE (when holiday_taken_date changes)
CREATE TRIGGER set_leave_year_on_update
BEFORE UPDATE OF holiday_taken_date ON public.holiday_payments
FOR EACH ROW
WHEN (OLD.holiday_taken_date IS DISTINCT FROM NEW.holiday_taken_date)
EXECUTE FUNCTION public.set_leave_year_from_holiday_date();

-- Add comment explaining the automation
COMMENT ON FUNCTION public.set_leave_year_from_holiday_date() IS 'Automatically sets leave_year_start/end based on the calendar year of holiday_taken_date';