-- Create branch enum type
CREATE TYPE public.branch_type AS ENUM ('Fitzrovia', 'Carnaby', 'Brixton');

-- Create employee_branches junction table for many-to-many relationship
CREATE TABLE public.employee_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  branch branch_type NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, branch)
);

-- Enable RLS
ALTER TABLE public.employee_branches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage employee branches"
ON public.employee_branches
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can view employee branches"
ON public.employee_branches
FOR SELECT
USING (has_any_role());

-- Add bank_details_exported_at to track first export
ALTER TABLE public.payroll_entries 
ADD COLUMN bank_details_exported BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX idx_employee_branches_employee_id ON public.employee_branches(employee_id);