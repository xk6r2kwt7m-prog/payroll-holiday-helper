
-- Add is_published flag to shifts so staff only see published schedules
ALTER TABLE public.shifts ADD COLUMN is_published boolean NOT NULL DEFAULT false;
ALTER TABLE public.shifts ADD COLUMN published_at timestamptz;

-- Update RLS: Staff can ONLY see published shifts assigned to them
DROP POLICY IF EXISTS "Staff can view own shifts" ON public.shifts;
CREATE POLICY "Staff can view own published shifts"
ON public.shifts FOR SELECT
USING (
  is_published = true
  AND employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);
