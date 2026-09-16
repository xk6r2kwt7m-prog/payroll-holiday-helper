-- Phase 3: structured premises licence records, conditions, and token-based
-- signature requests for licensing documents (DPS authorisation, Section 57,
-- staff alcohol-sales authorisation). Additive only.

CREATE TABLE IF NOT EXISTS public.premises_licences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch text NOT NULL,
  branch_location_id uuid REFERENCES public.branch_locations(id),
  premises_name text,
  premises_address text,
  licence_number text,
  licence_holder text,
  issuing_authority text,
  issue_date date,
  latest_variation_date date,
  licence_status text NOT NULL DEFAULT 'active',
  dps_name text,
  dps_personal_licence_number text,
  licensable_activities text[] NOT NULL DEFAULT '{}',
  opening_hours text,
  alcohol_hours text,
  late_night_refreshment_hours text,
  on_sales boolean NOT NULL DEFAULT true,
  off_sales boolean NOT NULL DEFAULT false,
  licence_document_id uuid REFERENCES public.compliance_documents(id),
  licence_summary_document_id uuid REFERENCES public.compliance_documents(id),
  licensed_plan_document_id uuid REFERENCES public.compliance_documents(id),
  section_57_document_id uuid REFERENCES public.compliance_documents(id),
  challenge_25_document_id uuid REFERENCES public.compliance_documents(id),
  dps_authorisation_document_id uuid REFERENCES public.compliance_documents(id),
  display_required boolean NOT NULL DEFAULT true,
  display_location text,
  last_physical_check date,
  physical_check_by text,
  display_photo_path text,
  replacement_needed boolean NOT NULL DEFAULT false,
  latest_version_printed boolean NOT NULL DEFAULT false,
  last_verified_date date,
  verified_by text,
  needs_confirmation boolean NOT NULL DEFAULT false,
  confirmation_note text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS premises_licences_tenant_branch_idx
  ON public.premises_licences (tenant_id, lower(btrim(branch)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.premises_licences TO authenticated;
GRANT ALL ON public.premises_licences TO service_role;
ALTER TABLE public.premises_licences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read premises licences"
  ON public.premises_licences FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant managers manage premises licences"
  ON public.premises_licences FOR ALL TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id))
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

CREATE TABLE IF NOT EXISTS public.premises_licence_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  licence_id uuid NOT NULL REFERENCES public.premises_licences(id) ON DELETE CASCADE,
  branch_location_id uuid REFERENCES public.branch_locations(id),
  condition_number text,
  legal_wording text NOT NULL,
  staff_instruction text,
  requirement_category text,
  responsible_job_title text,
  responsible_person text,
  frequency text,
  evidence_required text,
  related_document_id uuid REFERENCES public.compliance_documents(id),
  related_training_id uuid,
  status text NOT NULL DEFAULT 'active',
  last_check date,
  next_check date,
  corrective_action_id uuid REFERENCES public.compliance_actions(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS premises_licence_conditions_licence_idx
  ON public.premises_licence_conditions (licence_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.premises_licence_conditions TO authenticated;
GRANT ALL ON public.premises_licence_conditions TO service_role;
ALTER TABLE public.premises_licence_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read licence conditions"
  ON public.premises_licence_conditions FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant managers manage licence conditions"
  ON public.premises_licence_conditions FOR ALL TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id))
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

-- Token-based signature requests for licensing documents.
CREATE TABLE IF NOT EXISTS public.licence_signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch text,
  branch_location_id uuid REFERENCES public.branch_locations(id),
  licence_id uuid REFERENCES public.premises_licences(id) ON DELETE SET NULL,
  subject_type text NOT NULL,
  document_title text NOT NULL,
  document_body jsonb NOT NULL DEFAULT '{}'::jsonb,
  token text NOT NULL UNIQUE,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  recipient_role text,
  employee_id uuid REFERENCES public.employees(id),
  authorisation_id uuid REFERENCES public.alcohol_authorisations(id) ON DELETE SET NULL,
  personal_licence_number text,
  status text NOT NULL DEFAULT 'sent',
  read_at timestamptz,
  signed_at timestamptz,
  signature text,
  signer_name text,
  signer_ip text,
  signer_user_agent text,
  declined_note text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  sent_by uuid,
  sent_by_name text,
  signed_document_path text,
  is_test_record boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT licence_signature_requests_subject_type_check
    CHECK (subject_type IN ('dps_authorisation', 'section_57', 'staff_alcohol')),
  CONSTRAINT licence_signature_requests_status_check
    CHECK (status IN ('sent', 'viewed', 'read', 'signed', 'declined', 'cancelled', 'expired'))
);

CREATE INDEX IF NOT EXISTS licence_signature_requests_tenant_idx
  ON public.licence_signature_requests (tenant_id, subject_type, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.licence_signature_requests TO authenticated;
GRANT ALL ON public.licence_signature_requests TO service_role;
ALTER TABLE public.licence_signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant managers manage licence signature requests"
  ON public.licence_signature_requests FOR ALL TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id))
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

-- Distinguish a standalone alcohol authorisation send from an induction one.
ALTER TABLE public.alcohol_authorisations
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.licence_signature_requests(id) ON DELETE SET NULL;
ALTER TABLE public.alcohol_authorisations
  ADD COLUMN IF NOT EXISTS licence_id uuid REFERENCES public.premises_licences(id) ON DELETE SET NULL;

-- Audit log: allow compliance entries for the new tables.
DROP POLICY IF EXISTS "Tenant managers log compliance audit" ON public.audit_log;
CREATE POLICY "Tenant managers log compliance audit"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_manager_or_above(tenant_id)
    AND table_name IN (
      'compliance_documents', 'branch_compliance_items', 'compliance_certificates',
      'compliance_actions', 'inspection_checklist_items', 'branch_locations',
      'induction_packs', 'alcohol_authorisations',
      'incident_reports', 'incident_amendments', 'incident_evidence',
      'incident_witness_statements',
      'premises_licences', 'premises_licence_conditions', 'licence_signature_requests'
    )
  );