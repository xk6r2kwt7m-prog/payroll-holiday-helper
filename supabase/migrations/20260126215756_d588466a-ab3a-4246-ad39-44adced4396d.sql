-- =====================================================
-- Security Fix: Restrict sensitive employee data to admin only
-- =====================================================

-- 1. DROP overly permissive policies from employees table
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;

-- 2. DROP overly permissive policies from employee_documents table  
DROP POLICY IF EXISTS "Authenticated users can view employee documents" ON public.employee_documents;

-- 3. DROP overly permissive policies from employee_changes table
DROP POLICY IF EXISTS "Authenticated users can view employee changes" ON public.employee_changes;

-- 4. Create admin-only SELECT policy for employees (sensitive data)
CREATE POLICY "Only admins can view employees"
ON public.employees
FOR SELECT
USING (is_admin());

-- 5. Create admin-only SELECT policy for employee_documents
CREATE POLICY "Only admins can view employee documents"
ON public.employee_documents
FOR SELECT
USING (is_admin());

-- 6. Create admin-only SELECT policy for employee_changes
CREATE POLICY "Only admins can view employee changes"
ON public.employee_changes
FOR SELECT
USING (is_admin());

-- 7. Add storage policies for employee-documents bucket (admin only)
-- First drop any existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view employee documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view employee documents" ON storage.objects;

-- Create admin-only storage policies
CREATE POLICY "Only admins can view employee document files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'employee-documents' AND is_admin());

CREATE POLICY "Only admins can upload employee document files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'employee-documents' AND is_admin());

CREATE POLICY "Only admins can update employee document files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'employee-documents' AND is_admin())
WITH CHECK (bucket_id = 'employee-documents' AND is_admin());

CREATE POLICY "Only admins can delete employee document files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'employee-documents' AND is_admin());