
-- Helper: is manager or above (admin or manager)
CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
  )
$$;

-- Helper: is supervisor or above (admin, manager, or supervisor)
CREATE OR REPLACE FUNCTION public.is_supervisor_or_above()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'supervisor')
  )
$$;

-- Managers & supervisors can VIEW employees (sensitive fields hidden in frontend)
CREATE POLICY "Managers and supervisors can view employees"
ON public.employees FOR SELECT
USING (is_supervisor_or_above());

-- Managers can manage shifts
CREATE POLICY "Managers can manage shifts"
ON public.shifts FOR ALL
USING (is_manager_or_above())
WITH CHECK (is_manager_or_above());

-- Supervisors can view all shifts
CREATE POLICY "Supervisors can view shifts"
ON public.shifts FOR SELECT
USING (is_supervisor_or_above());

-- Managers can manage time entries
CREATE POLICY "Managers can manage time entries"
ON public.time_entries FOR ALL
USING (is_manager_or_above())
WITH CHECK (is_manager_or_above());

-- Supervisors can view time entries
CREATE POLICY "Supervisors can view time entries"
ON public.time_entries FOR SELECT
USING (is_supervisor_or_above());

-- Managers can view absence records
CREATE POLICY "Managers can view absence records"
ON public.absence_records FOR SELECT
USING (is_manager_or_above());

-- Managers can manage announcements
CREATE POLICY "Managers can manage announcements"
ON public.staff_announcements FOR ALL
USING (is_manager_or_above())
WITH CHECK (is_manager_or_above());

-- Managers can view holiday balances
CREATE POLICY "Managers can view holiday balances"
ON public.holiday_balances FOR SELECT
USING (is_manager_or_above());

-- Managers can view holiday adjustments
CREATE POLICY "Managers can view holiday adjustments"
ON public.holiday_adjustments FOR SELECT
USING (is_manager_or_above());

-- Managers can view & manage training records
CREATE POLICY "Managers can view training records"
ON public.training_records FOR SELECT
USING (is_manager_or_above());

CREATE POLICY "Managers can manage training records"
ON public.training_records FOR ALL
USING (is_manager_or_above())
WITH CHECK (is_manager_or_above());

-- Managers can view onboarding
CREATE POLICY "Managers can view onboarding progress"
ON public.onboarding_progress FOR SELECT
USING (is_manager_or_above());

CREATE POLICY "Managers can view onboarding templates"
ON public.onboarding_templates FOR SELECT
USING (is_manager_or_above());
