-- Stops future trigger-written timesheet history. Existing history remains immutable.
-- Review reason and approval mode columns stay so recorded evidence is not lost.
DROP TRIGGER IF EXISTS audit_time_entry_transactionally ON public.time_entries;
DROP FUNCTION IF EXISTS public.timesheet_history_ready();
DROP FUNCTION IF EXISTS public.audit_time_entry_write();
DROP FUNCTION IF EXISTS public.time_entry_history_snapshot(public.time_entries);
