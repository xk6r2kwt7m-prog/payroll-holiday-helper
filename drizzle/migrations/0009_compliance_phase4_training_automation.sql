-- Phase 4: training automation.
-- Additive only: nothing is dropped, renamed or retyped.

ALTER TABLE public.induction_packs
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_assigned boolean NOT NULL DEFAULT false;

-- A manager's decision about a new document version: who needs full retraining,
-- who only needs to acknowledge the new version, and who needs nothing.
-- The version each employee actually completed is never altered.
CREATE TABLE IF NOT EXISTS public.document_version_reissues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  previous_document_id uuid REFERENCES public.compliance_documents(id) ON DELETE SET NULL,
  from_version integer,
  to_version integer,
  change_significance text NOT NULL DEFAULT 'minor'
    CHECK (change_significance IN ('minor', 'significant')),
  decision text NOT NULL DEFAULT 'pending'
    CHECK (decision IN ('pending', 'no_action', 'acknowledge', 'retrain')),
  decision_note text,
  affected_employee_ids uuid[] NOT NULL DEFAULT '{}',
  affected_count integer NOT NULL DEFAULT 0,
  actioned_employee_ids uuid[] NOT NULL DEFAULT '{}',
  decided_by uuid,
  decided_by_name text,
  decided_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.document_version_reissues TO authenticated;
GRANT ALL ON public.document_version_reissues TO service_role;

ALTER TABLE public.document_version_reissues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members view document reissues"
  ON public.document_version_reissues FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant managers create document reissues"
  ON public.document_version_reissues FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant managers update document reissues"
  ON public.document_version_reissues FOR UPDATE TO authenticated
  USING (public.is_tenant_manager_or_above(tenant_id))
  WITH CHECK (public.is_tenant_manager_or_above(tenant_id));

CREATE INDEX IF NOT EXISTS document_version_reissues_pending_idx
  ON public.document_version_reissues (tenant_id, decision, created_at DESC);

-- Compliance audit entries for the new table.
DROP POLICY IF EXISTS "Tenant managers log compliance audit" ON public.audit_log;
CREATE POLICY "Tenant managers log compliance audit"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_manager_or_above(tenant_id)
    AND table_name IN (
      'compliance_documents', 'branch_compliance_items', 'compliance_certificates',
      'compliance_actions', 'inspection_checklist_items', 'branch_locations',
      'incident_reports', 'incident_amendments', 'incident_evidence',
      'incident_witness_statements', 'premises_licences', 'premises_licence_conditions',
      'licence_signature_requests', 'document_version_reissues', 'induction_packs'
    )
  );