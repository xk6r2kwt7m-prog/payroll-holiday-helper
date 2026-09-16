-- ============ Documents & Compliance ============
-- Additive only. Does not touch payroll, holiday, NMW or service-charge tables.

CREATE TABLE public.compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  file_path TEXT,
  applies_to_all_branches BOOLEAN NOT NULL DEFAULT true,
  branches TEXT[] NOT NULL DEFAULT '{}',
  applies_to_all_roles BOOLEAN NOT NULL DEFAULT true,
  roles TEXT[] NOT NULL DEFAULT '{}',
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  include_in_induction BOOLEAN NOT NULL DEFAULT false,
  must_display BOOLEAN NOT NULL DEFAULT false,
  inspection_required BOOLEAN NOT NULL DEFAULT false,
  alcohol_related BOOLEAN NOT NULL DEFAULT false,
  expires_at DATE,
  status TEXT NOT NULL DEFAULT 'active',
  supersedes_document_id UUID REFERENCES public.compliance_documents(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_documents TO authenticated;
GRANT ALL ON public.compliance_documents TO service_role;
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read compliance documents" ON public.compliance_documents
  FOR SELECT TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant admins manage compliance documents" ON public.compliance_documents
  FOR ALL TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')));
CREATE INDEX idx_compliance_documents_tenant ON public.compliance_documents(tenant_id, status);

CREATE TABLE public.induction_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  branch TEXT,
  staff_role TEXT,
  token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  issued_by UUID,
  issued_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  final_statement_text TEXT,
  final_signature_data TEXT,
  includes_alcohol BOOLEAN NOT NULL DEFAULT false,
  recipient_email TEXT,
  is_test_send BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.induction_packs TO authenticated;
GRANT ALL ON public.induction_packs TO service_role;
ALTER TABLE public.induction_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read induction packs" ON public.induction_packs
  FOR SELECT TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage induction packs" ON public.induction_packs
  FOR ALL TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')));
CREATE INDEX idx_induction_packs_employee ON public.induction_packs(employee_id, status);

CREATE TABLE public.induction_pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES public.induction_packs(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.compliance_documents(id) ON DELETE SET NULL,
  document_name TEXT NOT NULL,
  document_version INTEGER NOT NULL DEFAULT 1,
  document_category TEXT,
  file_path TEXT,
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  viewed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  signature_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.induction_pack_items TO authenticated;
GRANT ALL ON public.induction_pack_items TO service_role;
ALTER TABLE public.induction_pack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read induction pack items" ON public.induction_pack_items
  FOR SELECT TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage induction pack items" ON public.induction_pack_items
  FOR ALL TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')));
CREATE INDEX idx_induction_pack_items_pack ON public.induction_pack_items(pack_id);

CREATE TABLE public.alcohol_authorisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  branch TEXT,
  pack_id UUID REFERENCES public.induction_packs(id) ON DELETE SET NULL,
  authoriser_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  authoriser_name TEXT,
  authoriser_role TEXT,
  authoriser_licence_number TEXT,
  employee_signature TEXT,
  employee_signed_at TIMESTAMPTZ,
  authorised_at TIMESTAMPTZ,
  authoriser_confirmed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alcohol_authorisations TO authenticated;
GRANT ALL ON public.alcohol_authorisations TO service_role;
ALTER TABLE public.alcohol_authorisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read alcohol authorisations" ON public.alcohol_authorisations
  FOR SELECT TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage alcohol authorisations" ON public.alcohol_authorisations
  FOR ALL TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')));
CREATE INDEX idx_alcohol_auth_employee ON public.alcohol_authorisations(employee_id, status);

CREATE TABLE public.branch_compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  branch TEXT NOT NULL,
  document_id UUID REFERENCES public.compliance_documents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT,
  is_displayed BOOLEAN NOT NULL DEFAULT false,
  physical_copy_held BOOLEAN NOT NULL DEFAULT false,
  inspection_required BOOLEAN NOT NULL DEFAULT true,
  expiry_date DATE,
  last_reviewed_at TIMESTAMPTZ,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_compliance_items TO authenticated;
GRANT ALL ON public.branch_compliance_items TO service_role;
ALTER TABLE public.branch_compliance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read branch compliance items" ON public.branch_compliance_items
  FOR SELECT TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage branch compliance items" ON public.branch_compliance_items
  FOR ALL TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')));
CREATE INDEX idx_branch_compliance_branch ON public.branch_compliance_items(tenant_id, branch);

CREATE TABLE public.compliance_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  branch TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  source TEXT NOT NULL DEFAULT 'internal',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  evidence_file_path TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_actions TO authenticated;
GRANT ALL ON public.compliance_actions TO service_role;
ALTER TABLE public.compliance_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read compliance actions" ON public.compliance_actions
  FOR SELECT TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage compliance actions" ON public.compliance_actions
  FOR ALL TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')));
CREATE INDEX idx_compliance_actions_branch ON public.compliance_actions(tenant_id, branch, status);

CREATE TABLE public.compliance_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  branch TEXT NOT NULL,
  certificate_type TEXT NOT NULL,
  certificate_number TEXT,
  holder_name TEXT,
  issue_date DATE,
  expiry_date DATE,
  renewal_status TEXT NOT NULL DEFAULT 'current',
  file_path TEXT,
  receipt_path TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_certificates TO authenticated;
GRANT ALL ON public.compliance_certificates TO service_role;
ALTER TABLE public.compliance_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read compliance certificates" ON public.compliance_certificates
  FOR SELECT TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage compliance certificates" ON public.compliance_certificates
  FOR ALL TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')));
CREATE INDEX idx_compliance_certificates_expiry ON public.compliance_certificates(tenant_id, expiry_date);

CREATE TABLE public.inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  branch TEXT NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'missing',
  displayed BOOLEAN NOT NULL DEFAULT false,
  physical_copy_held BOOLEAN NOT NULL DEFAULT false,
  last_reviewed_at TIMESTAMPTZ,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_checklist_items TO authenticated;
GRANT ALL ON public.inspection_checklist_items TO service_role;
ALTER TABLE public.inspection_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read inspection checklist" ON public.inspection_checklist_items
  FOR SELECT TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Tenant managers manage inspection checklist" ON public.inspection_checklist_items
  FOR ALL TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('company_admin','manager')));
CREATE INDEX idx_inspection_checklist_branch ON public.inspection_checklist_items(tenant_id, branch);
