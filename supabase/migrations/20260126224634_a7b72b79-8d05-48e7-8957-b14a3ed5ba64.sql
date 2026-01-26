-- Add date tracking to holiday_payments to distinguish when holiday was taken vs paid
ALTER TABLE public.holiday_payments 
ADD COLUMN IF NOT EXISTS holiday_taken_date date,
ADD COLUMN IF NOT EXISTS leave_year_start date,
ADD COLUMN IF NOT EXISTS leave_year_end date;

-- Add comment explaining the fields
COMMENT ON COLUMN public.holiday_payments.holiday_taken_date IS 'The actual date(s) when the holiday was taken - determines which leave year entitlement is used';
COMMENT ON COLUMN public.holiday_payments.leave_year_start IS 'Start of the leave year this holiday draws from (e.g., 2025-01-01 for 2025 entitlement)';
COMMENT ON COLUMN public.holiday_payments.leave_year_end IS 'End of the leave year this holiday draws from (e.g., 2025-12-31 for 2025 entitlement)';

-- Create an index for efficient filtering by leave year
CREATE INDEX IF NOT EXISTS idx_holiday_payments_leave_year 
ON public.holiday_payments(leave_year_start, leave_year_end);