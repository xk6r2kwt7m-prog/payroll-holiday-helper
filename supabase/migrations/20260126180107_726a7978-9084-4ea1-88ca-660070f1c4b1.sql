-- Enum types for the payroll system
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'viewer');
CREATE TYPE public.department_type AS ENUM ('FOH', 'BOH', 'CPU');
CREATE TYPE public.employee_status AS ENUM ('active', 'leaver', 'starter');
CREATE TYPE public.payroll_status AS ENUM ('draft', 'pending', 'approved', 'rejected');
CREATE TYPE public.audit_action AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'import');

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Admin profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll periods (each import creates a new period)
CREATE TABLE public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    pay_date DATE,
    status payroll_status NOT NULL DEFAULT 'draft',
    timesheet_total DECIMAL(12, 2) DEFAULT 0,
    incentives_total DECIMAL(12, 2) DEFAULT 0,
    holidays_total DECIMAL(12, 2) DEFAULT 0,
    grand_total DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    imported_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employees master table
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_ref TEXT UNIQUE,
    forename TEXT NOT NULL,
    surname TEXT NOT NULL,
    department department_type NOT NULL,
    status employee_status NOT NULL DEFAULT 'active',
    hourly_rate DECIMAL(8, 2) NOT NULL,
    service_charge DECIMAL(8, 2) DEFAULT 0,
    ni_number TEXT,
    bank_account_no TEXT,
    sort_code TEXT,
    nationality TEXT,
    passport_no TEXT,
    settlement_status TEXT,
    sharing_code TEXT,
    residence_permit TEXT,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payroll entries (per employee per period)
CREATE TABLE public.payroll_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    hourly_rate DECIMAL(8, 2) NOT NULL,
    service_charge DECIMAL(8, 2) DEFAULT 0,
    timesheet_hours DECIMAL(8, 2) NOT NULL DEFAULT 0,
    performance_bonus DECIMAL(10, 2) DEFAULT 0,
    special_bonus DECIMAL(10, 2) DEFAULT 0,
    total_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
    holiday_accrued_hours DECIMAL(8, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (payroll_period_id, employee_id)
);

-- Holiday payments (per employee per period)
CREATE TABLE public.holiday_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    employee_name TEXT NOT NULL,
    rate DECIMAL(8, 2) NOT NULL,
    hours DECIMAL(8, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employee holiday balances (running totals)
CREATE TABLE public.holiday_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_year_start DATE NOT NULL,
    leave_year_end DATE NOT NULL,
    hours_accrued DECIMAL(8, 2) DEFAULT 0,
    hours_taken DECIMAL(8, 2) DEFAULT 0,
    hours_carried_over DECIMAL(8, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, leave_year_start)
);

-- Employee change history
CREATE TABLE public.employee_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES auth.users(id),
    change_type TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log for all actions
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action audit_action NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- File imports tracking
CREATE TABLE public.payroll_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id UUID REFERENCES public.payroll_periods(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_path TEXT,
    imported_by UUID REFERENCES auth.users(id),
    import_status TEXT DEFAULT 'pending',
    records_imported INTEGER DEFAULT 0,
    errors JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_imports ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Function to check if user has any role (authenticated)
CREATE OR REPLACE FUNCTION public.has_any_role()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_any_role());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for payroll data (admin/manager full access, viewer read-only)
CREATE POLICY "Authenticated users can view payroll periods"
ON public.payroll_periods FOR SELECT
TO authenticated
USING (public.has_any_role());

CREATE POLICY "Admins can manage payroll periods"
ON public.payroll_periods FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view employees"
ON public.employees FOR SELECT
TO authenticated
USING (public.has_any_role());

CREATE POLICY "Admins can manage employees"
ON public.employees FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view payroll entries"
ON public.payroll_entries FOR SELECT
TO authenticated
USING (public.has_any_role());

CREATE POLICY "Admins can manage payroll entries"
ON public.payroll_entries FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view holiday payments"
ON public.holiday_payments FOR SELECT
TO authenticated
USING (public.has_any_role());

CREATE POLICY "Admins can manage holiday payments"
ON public.holiday_payments FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view holiday balances"
ON public.holiday_balances FOR SELECT
TO authenticated
USING (public.has_any_role());

CREATE POLICY "Admins can manage holiday balances"
ON public.holiday_balances FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view employee changes"
ON public.employee_changes FOR SELECT
TO authenticated
USING (public.has_any_role());

CREATE POLICY "Admins can manage employee changes"
ON public.employee_changes FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can view audit log"
ON public.audit_log FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert audit log"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view imports"
ON public.payroll_imports FOR SELECT
TO authenticated
USING (public.has_any_role());

CREATE POLICY "Admins can manage imports"
ON public.payroll_imports FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- First user becomes admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_entries_updated_at
  BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holiday_balances_updated_at
  BEFORE UPDATE ON public.holiday_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Calculate holiday accrual based on UK law (12.07%)
CREATE OR REPLACE FUNCTION public.calculate_holiday_accrual(hours_worked DECIMAL)
RETURNS DECIMAL
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT ROUND(hours_worked * 0.1207, 2)
$$;

-- Trigger to auto-calculate holiday accrual on payroll entry
CREATE OR REPLACE FUNCTION public.set_holiday_accrual()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.holiday_accrued_hours = public.calculate_holiday_accrual(NEW.timesheet_hours);
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_holiday_accrual_trigger
  BEFORE INSERT OR UPDATE OF timesheet_hours ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_holiday_accrual();

-- Create indexes for performance
CREATE INDEX idx_employees_department ON public.employees(department);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_payroll_entries_period ON public.payroll_entries(payroll_period_id);
CREATE INDEX idx_payroll_entries_employee ON public.payroll_entries(employee_id);
CREATE INDEX idx_holiday_payments_period ON public.holiday_payments(payroll_period_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX idx_employee_changes_employee ON public.employee_changes(employee_id);