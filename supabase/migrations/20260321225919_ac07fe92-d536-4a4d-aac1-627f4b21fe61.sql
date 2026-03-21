
-- A. Partial unique index: prevent duplicate open clock-ins per employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_clock_in
ON public.time_entries (employee_id)
WHERE status = 'clocked_in';

-- B. Check constraint: prevent negative total_hours
ALTER TABLE public.time_entries
ADD CONSTRAINT chk_total_hours_non_negative
CHECK (total_hours IS NULL OR total_hours >= 0);

-- C. Validation trigger: prevent clock_out_time before clock_in_time
CREATE OR REPLACE FUNCTION public.validate_time_entry_times()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.clock_out_time IS NOT NULL AND NEW.clock_in_time IS NOT NULL THEN
    IF NEW.clock_out_time <= NEW.clock_in_time THEN
      RAISE EXCEPTION 'Clock-out time cannot be before or equal to clock-in time';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_time_entry_times
BEFORE INSERT OR UPDATE ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_time_entry_times();
