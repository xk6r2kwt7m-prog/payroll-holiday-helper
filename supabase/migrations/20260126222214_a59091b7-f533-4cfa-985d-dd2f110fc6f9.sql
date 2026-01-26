-- Fix security issues: Restrict sensitive data access to admins only

-- 1. Fix payroll_entries - currently allows any authenticated user to view
DROP POLICY IF EXISTS "Authenticated users can view payroll entries" ON public.payroll_entries;

CREATE POLICY "Only admins can view payroll entries"
ON public.payroll_entries
FOR SELECT
USING (is_admin());

-- 2. Fix holiday_payments - currently allows any authenticated user to view
DROP POLICY IF EXISTS "Authenticated users can view holiday payments" ON public.holiday_payments;

CREATE POLICY "Only admins can view holiday payments"
ON public.holiday_payments
FOR SELECT
USING (is_admin());

-- 3. Fix holiday_balances - currently allows any authenticated user to view
DROP POLICY IF EXISTS "Authenticated users can view holiday balances" ON public.holiday_balances;

CREATE POLICY "Only admins can view holiday balances"
ON public.holiday_balances
FOR SELECT
USING (is_admin());

-- 4. Fix payroll_periods - currently allows any authenticated user to view
DROP POLICY IF EXISTS "Authenticated users can view payroll periods" ON public.payroll_periods;

CREATE POLICY "Only admins can view payroll periods"
ON public.payroll_periods
FOR SELECT
USING (is_admin());

-- 5. Fix payroll_imports - currently allows any authenticated user to view
DROP POLICY IF EXISTS "Authenticated users can view imports" ON public.payroll_imports;

CREATE POLICY "Only admins can view imports"
ON public.payroll_imports
FOR SELECT
USING (is_admin());

-- 6. Fix employee_branches - restrict to admin only for consistency
DROP POLICY IF EXISTS "Authenticated users can view employee branches" ON public.employee_branches;

CREATE POLICY "Only admins can view employee branches"
ON public.employee_branches
FOR SELECT
USING (is_admin());