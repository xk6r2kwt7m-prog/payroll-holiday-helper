
-- Operational signals normalised analytics table
CREATE TABLE public.operational_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  source_table text NOT NULL,
  source_record_id text NOT NULL,
  signal_tag text NOT NULL,
  signal_date date NOT NULL,
  location_id uuid NULL,
  severity text NULL,
  confidence text NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness: same source record cannot be duplicated for the same signal tag
CREATE UNIQUE INDEX uq_operational_signals_source
  ON public.operational_signals (tenant_id, source_table, source_record_id, signal_tag);

-- Query indexes
CREATE INDEX idx_operational_signals_tenant_tag ON public.operational_signals (tenant_id, signal_tag);
CREATE INDEX idx_operational_signals_tenant_date ON public.operational_signals (tenant_id, signal_date);

-- RLS
ALTER TABLE public.operational_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read operational signals"
  ON public.operational_signals FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Managers can insert operational signals"
  ON public.operational_signals FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_above());

CREATE POLICY "Managers can update operational signals"
  ON public.operational_signals FOR UPDATE TO authenticated
  USING (public.is_manager_or_above());

CREATE POLICY "Managers can delete operational signals"
  ON public.operational_signals FOR DELETE TO authenticated
  USING (public.is_manager_or_above());

-- Updated_at trigger
CREATE TRIGGER update_operational_signals_updated_at
  BEFORE UPDATE ON public.operational_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
