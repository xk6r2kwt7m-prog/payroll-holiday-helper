-- Phase 1: canonical branch registry, richer document records, audit logging
-- Additive only. No existing column or table is dropped, renamed or retyped.

/* 1. Branch registry: review flag + protection against duplicate spellings */
ALTER TABLE public.branch_locations
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS branch_locations_tenant_branch_unique
  ON public.branch_locations (tenant_id, lower(btrim(branch)));

/* 2. Branch IDs on compliance records (branch text kept for compatibility) */
ALTER TABLE public.compliance_documents
  ADD COLUMN IF NOT EXISTS branch_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.branch_compliance_items
  ADD COLUMN IF NOT EXISTS branch_location_id uuid REFERENCES public.branch_locations(id);

ALTER TABLE public.compliance_certificates
  ADD COLUMN IF NOT EXISTS branch_location_id uuid REFERENCES public.branch_locations(id);

ALTER TABLE public.compliance_actions
  ADD COLUMN IF NOT EXISTS branch_location_id uuid REFERENCES public.branch_locations(id);

ALTER TABLE public.inspection_checklist_items
  ADD COLUMN IF NOT EXISTS branch_location_id uuid REFERENCES public.branch_locations(id);

/* 3. Extra document fields, approval workflow and ownership */
ALTER TABLE public.compliance_documents
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS review_date date,
  ADD COLUMN IF NOT EXISTS owner_job_title text,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS issuing_authority text,
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS requirement_classification text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_note text;

/* Backfill before constraints. Documents that already existed keep working but
   are flagged as awaiting a manager's approval decision. */
UPDATE public.compliance_documents
   SET approval_status = CASE WHEN status = 'archived' THEN 'archived' ELSE 'awaiting_approval' END
 WHERE approval_status = 'draft';

UPDATE public.compliance_documents d
   SET branch_ids = COALESCE((
         SELECT array_agg(bl.id)
           FROM public.branch_locations bl
          WHERE bl.tenant_id = d.tenant_id
            AND lower(btrim(bl.branch)) = ANY (
                  SELECT lower(btrim(x)) FROM unnest(d.branches) AS x)
       ), '{}'::uuid[])
 WHERE COALESCE(array_length(d.branches, 1), 0) > 0
   AND COALESCE(array_length(d.branch_ids, 1), 0) = 0;

UPDATE public.branch_compliance_items i
   SET branch_location_id = bl.id
  FROM public.branch_locations bl
 WHERE bl.tenant_id = i.tenant_id
   AND lower(btrim(bl.branch)) = lower(btrim(i.branch))
   AND i.branch_location_id IS NULL;

UPDATE public.compliance_certificates c
   SET branch_location_id = bl.id
  FROM public.branch_locations bl
 WHERE bl.tenant_id = c.tenant_id
   AND lower(btrim(bl.branch)) = lower(btrim(c.branch))
   AND c.branch_location_id IS NULL;

UPDATE public.compliance_actions a
   SET branch_location_id = bl.id
  FROM public.branch_locations bl
 WHERE bl.tenant_id = a.tenant_id
   AND lower(btrim(bl.branch)) = lower(btrim(a.branch))
   AND a.branch_location_id IS NULL;

UPDATE public.inspection_checklist_items k
   SET branch_location_id = bl.id
  FROM public.branch_locations bl
 WHERE bl.tenant_id = k.tenant_id
   AND lower(btrim(bl.branch)) = lower(btrim(k.branch))
   AND k.branch_location_id IS NULL;

/* 4. Value constraints (added after the backfill so existing rows pass) */
ALTER TABLE public.compliance_documents
  ADD CONSTRAINT compliance_documents_approval_status_check
  CHECK (approval_status IN ('draft','awaiting_approval','approved','rejected','archived'));

ALTER TABLE public.compliance_documents
  ADD CONSTRAINT compliance_documents_requirement_class_check
  CHECK (requirement_classification IS NULL OR requirement_classification IN (
    'legal_requirement','premises_licence_condition','council_or_inspector_request',
    'operational_good_practice','corrective_action','staff_training_document'));

/* 5. Managers may write compliance entries to the shared audit log.
      Updates and deletes stay blocked by the existing policies. */
DROP POLICY IF EXISTS "Tenant managers log compliance audit" ON public.audit_log;
CREATE POLICY "Tenant managers log compliance audit"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (
    table_name IN (
      'compliance_documents','compliance_certificates','branch_compliance_items',
      'compliance_actions','inspection_checklist_items','branch_locations'
    )
    AND tenant_id IN (
      SELECT tenant_members.tenant_id FROM public.tenant_members
       WHERE tenant_members.user_id = auth.uid()
         AND tenant_members.is_active = true
         AND tenant_members.role IN ('company_admin','manager')
    )
  );

CREATE INDEX IF NOT EXISTS audit_log_table_record_idx
  ON public.audit_log (table_name, record_id, created_at DESC);