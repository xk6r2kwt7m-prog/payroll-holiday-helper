-- Fix security warnings by setting search_path on trigger functions

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_holiday_accrual()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.holiday_accrued_hours = public.calculate_holiday_accrual(NEW.timesheet_hours);
  RETURN NEW;
END;
$$;