
-- Add imported_hours to track original imported value separately from adjusted timesheet_hours
ALTER TABLE public.payroll_entries
ADD COLUMN imported_hours numeric DEFAULT NULL;

-- Add adjustment_note for internal-only notes when hours are manually changed
ALTER TABLE public.payroll_entries
ADD COLUMN adjustment_note text DEFAULT NULL;

-- Update the holiday accrual trigger to use imported_hours when available
-- Holiday accrual is always based on original imported hours, not the adjusted value
CREATE OR REPLACE FUNCTION public.set_holiday_accrual()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use imported_hours for holiday calculation when available, otherwise fall back to timesheet_hours
  NEW.holiday_accrued_hours = public.calculate_holiday_accrual(COALESCE(NEW.imported_hours, NEW.timesheet_hours));
  RETURN NEW;
END;
$function$;
