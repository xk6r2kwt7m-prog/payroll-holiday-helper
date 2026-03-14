
-- Employee Availability: weekly availability patterns
CREATE TABLE public.employee_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_available boolean NOT NULL DEFAULT true,
  available_from time,
  available_to time,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, day_of_week)
);

ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage availability"
  ON public.employee_availability FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Managers can view availability"
  ON public.employee_availability FOR SELECT TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Staff can manage own availability"
  ON public.employee_availability FOR ALL TO authenticated
  USING (is_tenant_member(tenant_id) AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))
  WITH CHECK (is_tenant_member(tenant_id) AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- Employee Skills
CREATE TABLE public.employee_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  skill_type text NOT NULL DEFAULT 'role',
  skill_value text NOT NULL,
  proficiency_level smallint DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, skill_type, skill_value)
);

ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage skills"
  ON public.employee_skills FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Managers can view skills"
  ON public.employee_skills FOR SELECT TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Staff can view own skills"
  ON public.employee_skills FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id) AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- Staff Transfers
CREATE TABLE public.staff_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_branch text NOT NULL,
  to_branch text NOT NULL,
  transfer_date date NOT NULL,
  end_date date,
  is_temporary boolean NOT NULL DEFAULT false,
  reason text,
  transferred_by uuid,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage transfers"
  ON public.staff_transfers FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Managers can manage transfers"
  ON public.staff_transfers FOR ALL TO authenticated
  USING (is_tenant_manager_or_above(tenant_id))
  WITH CHECK (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Staff can view own transfers"
  ON public.staff_transfers FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id) AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
