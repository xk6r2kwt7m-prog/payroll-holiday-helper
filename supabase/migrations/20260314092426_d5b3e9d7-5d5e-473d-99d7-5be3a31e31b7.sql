
-- Onboarding requirements configuration per tenant
CREATE TABLE public.tenant_onboarding_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requirement_key text NOT NULL,
  requirement_label text NOT NULL,
  requirement_type text NOT NULL DEFAULT 'standard',
  is_critical boolean NOT NULL DEFAULT false,
  is_required boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, requirement_key)
);

ALTER TABLE public.tenant_onboarding_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_admins_manage_requirements" ON public.tenant_onboarding_requirements
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "tenant_members_view_requirements" ON public.tenant_onboarding_requirements
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

-- Seed default requirements for existing tenants
INSERT INTO public.tenant_onboarding_requirements (tenant_id, requirement_key, requirement_label, requirement_type, is_critical, is_required, display_order)
SELECT t.id, r.key, r.label, r.type, r.is_critical, r.is_required, r.display_order
FROM public.tenants t
CROSS JOIN (VALUES
  ('personal_information', 'Personal Information', 'data', false, true, 1),
  ('bank_details', 'Bank Details', 'data', false, true, 2),
  ('right_to_work', 'Right to Work', 'document', true, true, 3),
  ('contract_signed', 'Contract Signed', 'document', true, true, 4),
  ('emergency_contact', 'Emergency Contact', 'data', false, false, 5),
  ('availability', 'Availability', 'data', false, false, 6),
  ('training_records', 'Training Records', 'document', false, false, 7)
) AS r(key, label, type, is_critical, is_required, display_order);
