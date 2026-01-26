-- Fix remaining security warning - add search_path to calculate_holiday_accrual
CREATE OR REPLACE FUNCTION public.calculate_holiday_accrual(hours_worked DECIMAL)
RETURNS DECIMAL
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT ROUND(hours_worked * 0.1207, 2)
$$;