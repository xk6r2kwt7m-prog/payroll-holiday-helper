-- Revert only A04's permission guard. Does not modify any time entry.
DROP TRIGGER IF EXISTS enforce_manager_timesheet_permission ON public.time_entries;
DROP FUNCTION IF EXISTS public.prevent_disabled_manager_timesheet_writes();
