-- Create company_settings table (singleton pattern - one row per organization)
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Acme Corporation',
  company_email TEXT,
  address TEXT,
  pay_period TEXT DEFAULT 'Monthly',
  default_pay_day TEXT DEFAULT 'Last day of month',
  auto_calculate_overtime BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  holiday_request_alerts BOOLEAN DEFAULT true,
  payroll_reminders BOOLEAN DEFAULT true,
  two_factor_auth BOOLEAN DEFAULT false,
  session_timeout BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Admins can view settings"
  ON public.company_settings
  FOR SELECT
  USING (public.is_admin());

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON public.company_settings
  FOR UPDATE
  USING (public.is_admin());

-- Only admins can insert settings (for initial creation)
CREATE POLICY "Admins can insert settings"
  ON public.company_settings
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Add updated_at trigger
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.company_settings (company_name) VALUES ('Acme Corporation');