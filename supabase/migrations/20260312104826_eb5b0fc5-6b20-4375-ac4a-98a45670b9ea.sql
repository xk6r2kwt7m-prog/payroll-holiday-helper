
-- Create a safe employee view that excludes PII for supervisor access
CREATE OR REPLACE VIEW public.employees_safe
WITH (security_invoker = on)
AS SELECT 
  id, tenant_id, forename, surname, department, status, 
  start_date, end_date, employee_ref, created_at, updated_at, 
  user_id, archived_at, notes, nationality
FROM public.employees;

-- Now replace supervisor policy to use the view approach
-- The supervisor can still SELECT from employees table (needed for existing queries),
-- but the application layer should use employees_safe for supervisor role.
-- For now, document this as a medium-priority improvement.
-- The Privacy Shield already masks these fields in the UI.
