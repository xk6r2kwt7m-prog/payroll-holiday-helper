-- Mobile induction: module progress, health declaration, assessment, practical verification.

CREATE TABLE public.induction_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.induction_packs(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pack_id, module_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.induction_modules TO authenticated;
GRANT ALL ON public.induction_modules TO service_role;
ALTER TABLE public.induction_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read induction modules" ON public.induction_modules FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage induction modules" ON public.induction_modules FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true AND role = ANY (ARRAY['company_admin'::tenant_role,'manager'::tenant_role])))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true AND role = ANY (ARRAY['company_admin'::tenant_role,'manager'::tenant_role])));
CREATE INDEX idx_induction_modules_pack ON public.induction_modules(pack_id);

CREATE TABLE public.induction_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.induction_packs(id) ON DELETE CASCADE,
  employee_id UUID,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  has_yes_answer BOOLEAN NOT NULL DEFAULT false,
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  manager_review_notes TEXT,
  reviewed_by UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pack_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.induction_declarations TO authenticated;
GRANT ALL ON public.induction_declarations TO service_role;
ALTER TABLE public.induction_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read induction declarations" ON public.induction_declarations FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage induction declarations" ON public.induction_declarations FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true AND role = ANY (ARRAY['company_admin'::tenant_role,'manager'::tenant_role])))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true AND role = ANY (ARRAY['company_admin'::tenant_role,'manager'::tenant_role])));

CREATE TABLE public.induction_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.induction_packs(id) ON DELETE CASCADE,
  employee_id UUID,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.induction_assessments TO authenticated;
GRANT ALL ON public.induction_assessments TO service_role;
ALTER TABLE public.induction_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read induction assessments" ON public.induction_assessments FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage induction assessments" ON public.induction_assessments FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true AND role = ANY (ARRAY['company_admin'::tenant_role,'manager'::tenant_role])))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true AND role = ANY (ARRAY['company_admin'::tenant_role,'manager'::tenant_role])));
CREATE INDEX idx_induction_assessments_pack ON public.induction_assessments(pack_id);

CREATE TABLE public.induction_practical_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.induction_packs(id) ON DELETE CASCADE,
  employee_id UUID,
  group_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  applicable BOOLEAN NOT NULL DEFAULT true,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  verified_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.induction_practical_items TO authenticated;
GRANT ALL ON public.induction_practical_items TO service_role;
ALTER TABLE public.induction_practical_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read induction practical items" ON public.induction_practical_items FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage induction practical items" ON public.induction_practical_items FOR ALL TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true AND role = ANY (ARRAY['company_admin'::tenant_role,'manager'::tenant_role])))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND is_active = true AND role = ANY (ARRAY['company_admin'::tenant_role,'manager'::tenant_role])));
CREATE INDEX idx_induction_practical_pack ON public.induction_practical_items(pack_id);

-- Site-specific emergency and monitoring details used to fill induction blanks.
ALTER TABLE public.location_settings
  ADD COLUMN IF NOT EXISTS fire_exit_routes TEXT,
  ADD COLUMN IF NOT EXISTS fire_assembly_point TEXT,
  ADD COLUMN IF NOT EXISTS fire_alarm_call_points TEXT,
  ADD COLUMN IF NOT EXISTS evacuation_report_to TEXT,
  ADD COLUMN IF NOT EXISTS fire_hazard_reporting_route TEXT,
  ADD COLUMN IF NOT EXISTS first_aid_kit_location TEXT,
  ADD COLUMN IF NOT EXISTS accident_book_location TEXT,
  ADD COLUMN IF NOT EXISTS temperature_check_times TEXT;
