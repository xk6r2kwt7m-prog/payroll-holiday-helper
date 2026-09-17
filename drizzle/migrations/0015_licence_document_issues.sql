CREATE TABLE public.licence_document_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  branch TEXT NOT NULL,
  branch_location_id UUID REFERENCES public.branch_locations(id) ON DELETE SET NULL,
  licence_id UUID REFERENCES public.premises_licences(id) ON DELETE SET NULL,
  subject_type TEXT NOT NULL,
  issued_by UUID,
  issued_by_name TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  delivery_method TEXT NOT NULL DEFAULT 'download',
  message TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  authorised_count INTEGER NOT NULL DEFAULT 0,
  listed_count INTEGER NOT NULL DEFAULT 0,
  file_path TEXT,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  opened_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0,
  is_test_record BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT licence_document_issues_delivery_method_check
    CHECK (delivery_method IN ('download','email_attachment','email_link','email_both')),
  CONSTRAINT licence_document_issues_subject_type_check
    CHECK (subject_type IN ('dps_authorisation','section_57','staff_alcohol'))
);

CREATE UNIQUE INDEX licence_document_issues_token_idx
  ON public.licence_document_issues (access_token) WHERE access_token IS NOT NULL;
CREATE INDEX licence_document_issues_tenant_branch_idx
  ON public.licence_document_issues (tenant_id, branch, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.licence_document_issues TO authenticated;
GRANT ALL ON public.licence_document_issues TO service_role;

ALTER TABLE public.licence_document_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers view issued licensing documents"
ON public.licence_document_issues FOR SELECT
TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = auth.uid() AND is_active = true
    AND role IN ('company_admin','manager','supervisor')
));

CREATE POLICY "Managers record issued licensing documents"
ON public.licence_document_issues FOR INSERT
TO authenticated
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = auth.uid() AND is_active = true
    AND role IN ('company_admin','manager')
));

CREATE POLICY "Managers revoke issued licensing document links"
ON public.licence_document_issues FOR UPDATE
TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = auth.uid() AND is_active = true
    AND role IN ('company_admin','manager')
))
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = auth.uid() AND is_active = true
    AND role IN ('company_admin','manager')
));