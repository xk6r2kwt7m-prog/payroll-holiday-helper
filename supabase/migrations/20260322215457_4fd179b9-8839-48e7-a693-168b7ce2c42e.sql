
-- Add preferred_name and import_aliases to employees table for nickname/alias matching
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS import_aliases text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.employees.preferred_name IS 'Preferred/informal name used day-to-day (e.g. Vicky for Viktoriia)';
COMMENT ON COLUMN public.employees.import_aliases IS 'Array of alternative names used in timesheet imports for matching';
