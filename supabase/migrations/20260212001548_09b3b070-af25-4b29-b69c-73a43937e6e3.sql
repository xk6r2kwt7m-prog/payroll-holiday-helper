
-- 1. Add 'staff' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';

-- 2. Add user_id to employees table (links staff accounts)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id) WHERE user_id IS NOT NULL;

-- 3. Branch locations with GPS coordinates for geofencing
CREATE TABLE public.branch_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch public.branch_type NOT NULL UNIQUE,
  display_name text NOT NULL,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  geofence_radius_meters integer NOT NULL DEFAULT 100,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branch_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage branch locations" ON public.branch_locations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Staff can view branch locations" ON public.branch_locations FOR SELECT TO authenticated USING (has_any_role());

-- Seed branch locations (you'll update GPS coords later)
INSERT INTO public.branch_locations (branch, display_name, latitude, longitude, address) VALUES
  ('Fitzrovia', 'UD Fitzrovia', 51.5185, -0.1377, '30 Rathbone Place, London W1T 1JG'),
  ('Carnaby', 'UD Carnaby', 51.5133, -0.1388, 'Carnaby Street, London W1F'),
  ('Brixton', 'UD Brixton', 51.4613, -0.1156, 'Brixton, London SW9');

-- 4. Shifts table (the rota/schedule)
CREATE TYPE public.shift_status AS ENUM ('scheduled', 'open', 'cancelled');

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  branch public.branch_type NOT NULL,
  department public.department_type NOT NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status public.shift_status NOT NULL DEFAULT 'scheduled',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_shifts_date ON public.shifts(shift_date);
CREATE INDEX idx_shifts_employee ON public.shifts(employee_id);
CREATE INDEX idx_shifts_branch_date ON public.shifts(branch, shift_date);

CREATE POLICY "Admins can manage shifts" ON public.shifts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Staff can view own shifts" ON public.shifts FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- 5. Time entries (clock in/out records)
CREATE TYPE public.time_entry_status AS ENUM ('clocked_in', 'pending', 'approved', 'rejected');

CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  branch public.branch_type NOT NULL,
  department public.department_type NOT NULL,
  clock_in_time timestamptz NOT NULL,
  clock_out_time timestamptz,
  clock_in_latitude numeric(10, 7),
  clock_in_longitude numeric(10, 7),
  clock_out_latitude numeric(10, 7),
  clock_out_longitude numeric(10, 7),
  clock_in_within_geofence boolean DEFAULT false,
  clock_out_within_geofence boolean DEFAULT false,
  scheduled_start time,
  scheduled_end time,
  total_hours numeric(5, 2),
  break_minutes integer DEFAULT 0,
  status public.time_entry_status NOT NULL DEFAULT 'clocked_in',
  manager_override boolean DEFAULT false,
  override_reason text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_time_entries_employee ON public.time_entries(employee_id);
CREATE INDEX idx_time_entries_date ON public.time_entries(clock_in_time);
CREATE INDEX idx_time_entries_status ON public.time_entries(status);

CREATE POLICY "Admins can manage time entries" ON public.time_entries FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Staff can view own time entries" ON public.time_entries FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Staff can insert own time entries" ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "Staff can update own clocked_in entries" ON public.time_entries FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND status = 'clocked_in');

-- 6. Function to calculate total hours on clock-out
CREATE OR REPLACE FUNCTION public.calculate_time_entry_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out_time IS NOT NULL AND NEW.clock_in_time IS NOT NULL THEN
    NEW.total_hours = ROUND(
      EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 3600.0 - (COALESCE(NEW.break_minutes, 0) / 60.0),
      2
    );
    -- Auto-set to pending when clocking out
    IF OLD.status = 'clocked_in' AND NEW.clock_out_time IS NOT NULL THEN
      NEW.status = 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_time_entry_hours
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_time_entry_hours();

-- 7. Updated_at triggers
CREATE TRIGGER update_branch_locations_updated_at
  BEFORE UPDATE ON public.branch_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Enable realtime for time_entries (live clock-in tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
