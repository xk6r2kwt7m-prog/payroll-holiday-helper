
-- Training effectiveness records for measuring operational impact of training
CREATE TABLE public.training_effectiveness_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id uuid NOT NULL,
  location_id uuid REFERENCES public.branch_locations(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  evaluation_type text NOT NULL DEFAULT 'module_level',
  evaluation_window_days integer NOT NULL DEFAULT 30,
  baseline_signal_count integer NOT NULL DEFAULT 0,
  post_training_signal_count integer NOT NULL DEFAULT 0,
  delta_count integer NOT NULL DEFAULT 0,
  delta_percent numeric(7,2) NOT NULL DEFAULT 0,
  result_status text NOT NULL DEFAULT 'insufficient_data',
  confidence_level text NOT NULL DEFAULT 'low',
  signal_types text[] NOT NULL DEFAULT '{}',
  measured_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_effectiveness_tenant ON public.training_effectiveness_records(tenant_id);
CREATE INDEX idx_effectiveness_module ON public.training_effectiveness_records(module_id);
CREATE INDEX idx_effectiveness_result ON public.training_effectiveness_records(result_status);

-- RLS
ALTER TABLE public.training_effectiveness_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view effectiveness records"
ON public.training_effectiveness_records
FOR SELECT
TO authenticated
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant admins can manage effectiveness records"
ON public.training_effectiveness_records
FOR ALL
TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

-- Updated at trigger
CREATE TRIGGER update_effectiveness_updated_at
  BEFORE UPDATE ON public.training_effectiveness_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
