-- Auto-recalculate total_pay whenever payroll entry fields change
CREATE OR REPLACE FUNCTION public.recalculate_total_pay()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_pay := ROUND(
    (NEW.timesheet_hours * NEW.hourly_rate)
    + (NEW.timesheet_hours * COALESCE(NEW.service_charge, 0))
    + COALESCE(NEW.performance_bonus, 0)
    + COALESCE(NEW.special_bonus, 0)
  , 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fire before insert or update on relevant columns
CREATE TRIGGER trg_recalculate_total_pay
BEFORE INSERT OR UPDATE OF timesheet_hours, hourly_rate, service_charge, performance_bonus, special_bonus
ON public.payroll_entries
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_total_pay();