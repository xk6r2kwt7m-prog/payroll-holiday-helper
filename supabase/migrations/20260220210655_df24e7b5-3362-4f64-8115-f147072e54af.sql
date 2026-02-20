
-- Create location_settings table for configuring branch-specific rules
CREATE TABLE public.location_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch public.branch_type NOT NULL UNIQUE,
  
  -- General
  display_name text NOT NULL,
  address text,
  timezone text NOT NULL DEFAULT 'Europe/London',
  
  -- Operating hours (JSON: { "Mon": { "open": "11:30", "close": "22:30" }, ... })
  operating_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Scheduling
  allow_open_shifts boolean NOT NULL DEFAULT true,
  allow_shift_swaps boolean NOT NULL DEFAULT false,
  allow_shift_offers boolean NOT NULL DEFAULT false,
  scheduling_suggestion_order text NOT NULL DEFAULT 'most_available',
  
  -- Timesheets / Clock-in rules
  allow_web_clock_in boolean NOT NULL DEFAULT true,
  allow_mobile_clock_in boolean NOT NULL DEFAULT true,
  require_gps_on_clock_in boolean NOT NULL DEFAULT true,
  require_geofence boolean NOT NULL DEFAULT true,
  geofence_radius_meters integer NOT NULL DEFAULT 100,
  auto_approve_timesheets boolean NOT NULL DEFAULT false,
  minimum_shift_length_minutes integer NOT NULL DEFAULT 60,
  
  -- Break rules
  default_break_minutes integer NOT NULL DEFAULT 0,
  enforce_break_after_hours numeric NOT NULL DEFAULT 6,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.location_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage
CREATE POLICY "Admins can manage location settings"
  ON public.location_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Staff can view location settings"
  ON public.location_settings FOR SELECT
  USING (has_any_role());

-- Auto-update updated_at
CREATE TRIGGER update_location_settings_updated_at
  BEFORE UPDATE ON public.location_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with defaults for each branch
INSERT INTO public.location_settings (branch, display_name, address, operating_hours) VALUES
  ('Fitzrovia', 'Fitzrovia', '26 Foley Street, London W1W 6DS', 
   '{"Mon":{"open":"11:30","close":"22:30"},"Tue":{"open":"11:30","close":"22:30"},"Wed":{"open":"11:30","close":"22:30"},"Thu":{"open":"11:30","close":"23:30"},"Fri":{"open":"11:30","close":"23:30"},"Sat":{"open":"11:30","close":"23:30"},"Sun":{"open":"11:30","close":"20:30"}}'),
  ('Carnaby', 'Carnaby', 'Carnaby Street, London W1F', 
   '{"Mon":{"open":"11:30","close":"22:30"},"Tue":{"open":"11:30","close":"22:30"},"Wed":{"open":"11:30","close":"22:30"},"Thu":{"open":"11:30","close":"23:30"},"Fri":{"open":"11:30","close":"23:30"},"Sat":{"open":"11:30","close":"23:30"},"Sun":{"open":"11:30","close":"20:30"}}'),
  ('Brixton', 'Brixton', 'Brixton Village, London SW9', 
   '{"Mon":{"open":"11:30","close":"22:30"},"Tue":{"open":"11:30","close":"22:30"},"Wed":{"open":"11:30","close":"22:30"},"Thu":{"open":"11:30","close":"23:30"},"Fri":{"open":"11:30","close":"23:30"},"Sat":{"open":"11:30","close":"23:30"},"Sun":{"open":"11:30","close":"20:30"}}');
