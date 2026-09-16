-- Phase 2: Digital Incident Book (inside the existing Documents & Compliance module)

CREATE TABLE public.incident_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  can_view_medical boolean NOT NULL DEFAULT false,
  can_view_senior boolean NOT NULL DEFAULT false,
  note text,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_access_grants TO authenticated;
GRANT ALL ON public.incident_access_grants TO service_role;
ALTER TABLE public.incident_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant managers read incident access grants" ON public.incident_access_grants
  FOR SELECT TO authenticated USING (public.is_tenant_manager_or_above(tenant_id));
CREATE POLICY "Tenant admins manage incident access grants" ON public.incident_access_grants
  FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

-- Who may see a record at a given confidentiality level
CREATE OR REPLACE FUNCTION public.can_view_incident(_tenant_id uuid, _confidentiality text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_tenant_admin(_tenant_id) THEN true
    WHEN _confidentiality IN ('operational', 'restricted_personal')
      THEN public.is_tenant_manager_or_above(_tenant_id)
    WHEN _confidentiality = 'restricted_medical' THEN EXISTS (
      SELECT 1 FROM public.incident_access_grants g
      WHERE g.tenant_id = _tenant_id AND g.user_id = auth.uid() AND g.can_view_medical
    )
    WHEN _confidentiality = 'senior_only' THEN EXISTS (
      SELECT 1 FROM public.incident_access_grants g
      WHERE g.tenant_id = _tenant_id AND g.user_id = auth.uid() AND g.can_view_senior
    )
    ELSE false
  END
$$;

CREATE TABLE public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  report_number text,
  branch text,
  branch_location_id uuid REFERENCES public.branch_locations(id),
  status text NOT NULL DEFAULT 'draft',
  category text NOT NULL,
  incident_date date,
  incident_time text,
  location_detail text,
  people_involved text,
  description text,
  immediate_action text,
  manager_notified boolean NOT NULL DEFAULT false,
  manager_notified_name text,
  evidence_available boolean NOT NULL DEFAULT false,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidentiality text NOT NULL DEFAULT 'operational',
  licence_condition_28 boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  reported_by_employee_id uuid REFERENCES public.employees(id),
  reported_by_name text,
  submitted_by uuid,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  findings text,
  root_cause text,
  immediate_controls text,
  riddor_flagged boolean NOT NULL DEFAULT false,
  riddor_assessment text,
  insurance_notified boolean NOT NULL DEFAULT false,
  authority_notified boolean NOT NULL DEFAULT false,
  authority_reference text,
  training_required text,
  outcome text,
  responsible_job_title text,
  responsible_person text,
  action_deadline date,
  manager_signature text,
  closed_at timestamptz,
  closed_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT incident_status_check CHECK (status IN ('draft','submitted','under_review','investigating','closed')),
  CONSTRAINT incident_confidentiality_check CHECK (confidentiality IN ('operational','restricted_personal','restricted_medical','senior_only'))
);

CREATE INDEX idx_incident_reports_tenant_status ON public.incident_reports (tenant_id, status, incident_date DESC);
CREATE INDEX idx_incident_reports_branch ON public.incident_reports (tenant_id, branch_location_id);

GRANT SELECT, INSERT, UPDATE ON public.incident_reports TO authenticated;
GRANT ALL ON public.incident_reports TO service_role;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Staff: their own reports only
CREATE POLICY "Staff read own incidents" ON public.incident_reports
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Staff create own incidents" ON public.incident_reports
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_member(tenant_id) AND created_by = auth.uid());
-- Staff may only edit their own drafts; submitted reports become read-only to them
CREATE POLICY "Staff edit own drafts" ON public.incident_reports
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status = 'draft')
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authorised managers read incidents" ON public.incident_reports
  FOR SELECT TO authenticated
  USING (public.can_view_incident(tenant_id, confidentiality));
CREATE POLICY "Authorised managers update incidents" ON public.incident_reports
  FOR UPDATE TO authenticated
  USING (public.can_view_incident(tenant_id, confidentiality))
  WITH CHECK (public.can_view_incident(tenant_id, confidentiality));
CREATE POLICY "Managers create incidents" ON public.incident_reports
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

-- Report number assigned on submission; never reused
CREATE OR REPLACE FUNCTION public.assign_incident_report_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year text;
  _seq integer;
BEGIN
  IF NEW.report_number IS NULL AND NEW.status <> 'draft' THEN
    _year := to_char(COALESCE(NEW.incident_date, CURRENT_DATE), 'YYYY');
    SELECT COALESCE(MAX(NULLIF(regexp_replace(report_number, '^.*-', ''), '')::integer), 0) + 1
      INTO _seq
      FROM public.incident_reports
     WHERE tenant_id = NEW.tenant_id
       AND report_number LIKE 'INC-' || _year || '-%';
    NEW.report_number := 'INC-' || _year || '-' || lpad(_seq::text, 4, '0');
  END IF;
  IF NEW.submitted_at IS NULL AND NEW.status <> 'draft' THEN
    NEW.submitted_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incident_report_number
BEFORE INSERT OR UPDATE ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION public.assign_incident_report_number();

-- Submitted reports are never deleted; corrections are recorded as amendments
CREATE TABLE public.incident_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  incident_id uuid NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  reason text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  amended_by uuid,
  amended_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_amendments_incident ON public.incident_amendments (incident_id, created_at DESC);
GRANT SELECT, INSERT ON public.incident_amendments TO authenticated;
GRANT ALL ON public.incident_amendments TO service_role;
ALTER TABLE public.incident_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorised managers read amendments" ON public.incident_amendments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incident_reports i
    WHERE i.id = incident_id AND (public.can_view_incident(i.tenant_id, i.confidentiality) OR i.created_by = auth.uid())
  ));
CREATE POLICY "Authorised managers add amendments" ON public.incident_amendments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.incident_reports i
    WHERE i.id = incident_id AND public.can_view_incident(i.tenant_id, i.confidentiality)
  ));

CREATE TABLE public.incident_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  incident_id uuid NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'file',
  label text,
  file_path text,
  file_name text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_evidence_incident ON public.incident_evidence (incident_id);
GRANT SELECT, INSERT ON public.incident_evidence TO authenticated;
GRANT ALL ON public.incident_evidence TO service_role;
ALTER TABLE public.incident_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read incident evidence" ON public.incident_evidence
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incident_reports i
    WHERE i.id = incident_id AND (public.can_view_incident(i.tenant_id, i.confidentiality) OR i.created_by = auth.uid())
  ));
CREATE POLICY "Add incident evidence" ON public.incident_evidence
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.incident_reports i
    WHERE i.id = incident_id AND (public.can_view_incident(i.tenant_id, i.confidentiality) OR i.created_by = auth.uid())
  ));

CREATE TABLE public.incident_witness_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  incident_id uuid NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  witness_name text NOT NULL,
  witness_role text,
  statement text,
  file_path text,
  taken_by uuid,
  taken_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_witness_incident ON public.incident_witness_statements (incident_id);
GRANT SELECT, INSERT ON public.incident_witness_statements TO authenticated;
GRANT ALL ON public.incident_witness_statements TO service_role;
ALTER TABLE public.incident_witness_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorised managers read witness statements" ON public.incident_witness_statements
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.incident_reports i
    WHERE i.id = incident_id AND public.can_view_incident(i.tenant_id, i.confidentiality)
  ));
CREATE POLICY "Authorised managers add witness statements" ON public.incident_witness_statements
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.incident_reports i
    WHERE i.id = incident_id AND public.can_view_incident(i.tenant_id, i.confidentiality)
  ));

-- Compliance actions gain a link back to the incident that raised them
ALTER TABLE public.compliance_actions ADD COLUMN IF NOT EXISTS incident_id uuid REFERENCES public.incident_reports(id);

-- Incident tables are auditable through the shared audit log
DROP POLICY IF EXISTS "Tenant managers log compliance audit" ON public.audit_log;
CREATE POLICY "Tenant managers log compliance audit" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members m
      WHERE m.tenant_id = audit_log.tenant_id
        AND m.user_id = auth.uid()
        AND m.is_active
        AND m.role IN ('company_admin', 'manager')
    )
    AND table_name IN (
      'compliance_documents', 'branch_compliance_items', 'compliance_certificates',
      'compliance_actions', 'inspection_checklist_items', 'branch_locations',
      'induction_packs', 'alcohol_authorisations',
      'incident_reports', 'incident_amendments', 'incident_evidence',
      'incident_witness_statements', 'premises_licences', 'premises_licence_conditions'
    )
  );

-- Staff may log their own incident activity (create/submit/evidence upload)
CREATE POLICY "Tenant members log incident audit" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_member(tenant_id)
    AND user_id = auth.uid()
    AND table_name IN ('incident_reports', 'incident_evidence')
  );
