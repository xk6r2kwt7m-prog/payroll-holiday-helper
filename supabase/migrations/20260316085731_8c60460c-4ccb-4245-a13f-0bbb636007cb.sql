
-- Module-to-Signal Mappings table
-- Supports both auto-derived (from standards_metadata) and manual admin mappings

CREATE TABLE public.module_signal_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id UUID NOT NULL,
  signal_tag TEXT NOT NULL,
  mapping_source TEXT NOT NULL DEFAULT 'auto' CHECK (mapping_source IN ('auto', 'manual')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one mapping per module+signal_tag+source per tenant
ALTER TABLE public.module_signal_mappings
  ADD CONSTRAINT uq_module_signal_mapping UNIQUE (tenant_id, module_id, signal_tag, mapping_source);

-- Indexes for common queries
CREATE INDEX idx_module_signal_mappings_tenant ON public.module_signal_mappings(tenant_id);
CREATE INDEX idx_module_signal_mappings_module ON public.module_signal_mappings(tenant_id, module_id);
CREATE INDEX idx_module_signal_mappings_signal ON public.module_signal_mappings(tenant_id, signal_tag);

-- Enable RLS
ALTER TABLE public.module_signal_mappings ENABLE ROW LEVEL SECURITY;

-- RLS: tenant members can read
CREATE POLICY "Tenant members can view signal mappings"
  ON public.module_signal_mappings FOR SELECT
  TO authenticated
  USING (public.is_tenant_member(tenant_id));

-- RLS: only manager+ can insert
CREATE POLICY "Managers can create signal mappings"
  ON public.module_signal_mappings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

-- RLS: only manager+ can update
CREATE POLICY "Managers can update signal mappings"
  ON public.module_signal_mappings FOR UPDATE
  TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id));

-- RLS: only manager+ can delete
CREATE POLICY "Managers can delete signal mappings"
  ON public.module_signal_mappings FOR DELETE
  TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id));

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_module_signal_mappings
  BEFORE UPDATE ON public.module_signal_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
