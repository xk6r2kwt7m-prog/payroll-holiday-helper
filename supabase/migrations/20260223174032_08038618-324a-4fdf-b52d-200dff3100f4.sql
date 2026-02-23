
-- Add archived_at column to employees
ALTER TABLE public.employees ADD COLUMN archived_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient filtering
CREATE INDEX idx_employees_archived_at ON public.employees (archived_at);
