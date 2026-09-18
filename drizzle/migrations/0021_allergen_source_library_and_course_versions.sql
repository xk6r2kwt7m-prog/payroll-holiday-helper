-- Controlled allergen training source library, conflicts, change proposals and
-- course versions. Everything is additive: no existing table is altered in a
-- breaking way, and published course versions are never updated or deleted.

CREATE TABLE public.allergen_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  compliance_document_id uuid REFERENCES public.compliance_documents(id) ON DELETE SET NULL,
  title text NOT NULL,
  /* packaging_supplier | allergen_matrix | recipe | operational_procedure | historical */
  source_rank text NOT NULL DEFAULT 'historical',
  source_version text,
  source_date date,
  is_current boolean NOT NULL DEFAULT false,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT allergen_sources_rank_check CHECK (source_rank IN (
    'packaging_supplier','allergen_matrix','recipe','operational_procedure','historical'
  ))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allergen_sources TO authenticated;
GRANT ALL ON public.allergen_sources TO service_role;
ALTER TABLE public.allergen_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read allergen sources" ON public.allergen_sources
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "Tenant admins manage allergen sources" ON public.allergen_sources
  FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE TABLE public.allergen_dish_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dish_name text NOT NULL,
  /* main | side | sauce | garnish | dessert | drink */
  dish_kind text NOT NULL DEFAULT 'main',
  regulated_allergens text[] NOT NULL DEFAULT '{}',
  other_allergens text[] NOT NULL DEFAULT '{}',
  cross_contact_note text,
  availability_note text,
  /* the branches where the dish is live on POS and customer menu */
  active_branch_ids uuid[] NOT NULL DEFAULT '{}',
  /* false until an approved matrix confirms the line: no scored questions */
  is_confirmed boolean NOT NULL DEFAULT false,
  source_id uuid REFERENCES public.allergen_sources(id) ON DELETE SET NULL,
  source_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT allergen_dish_reference_kind_check CHECK (dish_kind IN ('main','side','sauce','garnish','dessert','drink')),
  CONSTRAINT allergen_dish_reference_unique UNIQUE (tenant_id, dish_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allergen_dish_reference TO authenticated;
GRANT ALL ON public.allergen_dish_reference TO service_role;
ALTER TABLE public.allergen_dish_reference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read allergen dish reference" ON public.allergen_dish_reference
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "Tenant admins manage allergen dish reference" ON public.allergen_dish_reference
  FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE TABLE public.allergen_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subject text NOT NULL,
  /* dish | procedure */
  subject_kind text NOT NULL DEFAULT 'dish',
  /* [{source_id, source_title, source_rank, source_version, source_date, statement}] */
  statements jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_wording text,
  affected_lessons text[] NOT NULL DEFAULT '{}',
  affected_questions text[] NOT NULL DEFAULT '{}',
  needs_admin_decision boolean NOT NULL DEFAULT false,
  /* open | resolved | dismissed */
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT allergen_conflicts_kind_check CHECK (subject_kind IN ('dish','procedure')),
  CONSTRAINT allergen_conflicts_status_check CHECK (status IN ('open','resolved','dismissed'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allergen_conflicts TO authenticated;
GRANT ALL ON public.allergen_conflicts TO service_role;
ALTER TABLE public.allergen_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read allergen conflicts" ON public.allergen_conflicts
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "Tenant admins manage allergen conflicts" ON public.allergen_conflicts
  FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE TABLE public.allergen_change_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  /* addition | correction */
  change_type text NOT NULL DEFAULT 'addition',
  /* lesson | question | dish_reference | practical_signoff | emergency_procedure */
  target_kind text NOT NULL DEFAULT 'lesson',
  target_ref text,
  target_label text NOT NULL,
  current_text text,
  proposed_text text NOT NULL,
  rationale text,
  /* allergen_sources ids backing the proposal */
  source_ids uuid[] NOT NULL DEFAULT '{}',
  conflict_id uuid REFERENCES public.allergen_conflicts(id) ON DELETE SET NULL,
  /* proposed | approved | rejected | sent_back | published */
  status text NOT NULL DEFAULT 'proposed',
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  published_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT allergen_change_proposals_type_check CHECK (change_type IN ('addition','correction')),
  CONSTRAINT allergen_change_proposals_target_check CHECK (target_kind IN (
    'lesson','question','dish_reference','practical_signoff','emergency_procedure'
  )),
  CONSTRAINT allergen_change_proposals_status_check CHECK (status IN (
    'proposed','approved','rejected','sent_back','published'
  ))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allergen_change_proposals TO authenticated;
GRANT ALL ON public.allergen_change_proposals TO service_role;
ALTER TABLE public.allergen_change_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read allergen change proposals" ON public.allergen_change_proposals
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "Tenant admins manage allergen change proposals" ON public.allergen_change_proposals
  FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE TABLE public.allergen_course_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  version integer NOT NULL,
  review_date date,
  /* full snapshot: lessons, questions, practical sign-off, dish reference, emergency procedure */
  content jsonb NOT NULL,
  /* every statement/question -> supporting source ids */
  source_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_proposal_ids uuid[] NOT NULL DEFAULT '{}',
  published_by uuid,
  published_at timestamptz NOT NULL DEFAULT now(),
  note text,
  CONSTRAINT allergen_course_versions_unique UNIQUE (tenant_id, version)
);
GRANT SELECT, INSERT ON public.allergen_course_versions TO authenticated;
GRANT SELECT, INSERT ON public.allergen_course_versions TO service_role;
ALTER TABLE public.allergen_course_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read allergen course versions" ON public.allergen_course_versions
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "Tenant admins publish allergen course versions" ON public.allergen_course_versions
  FOR INSERT TO authenticated WITH CHECK (public.is_tenant_admin(tenant_id));

-- Published versions are evidence: block any attempt to change or remove one.
CREATE OR REPLACE FUNCTION public.protect_allergen_course_versions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Published allergen course versions are permanent records and cannot be changed or deleted';
END;
$$;

CREATE TRIGGER allergen_course_versions_immutable
BEFORE UPDATE OR DELETE ON public.allergen_course_versions
FOR EACH ROW EXECUTE FUNCTION public.protect_allergen_course_versions();

CREATE INDEX idx_allergen_sources_tenant ON public.allergen_sources(tenant_id, source_rank);
CREATE INDEX idx_allergen_dish_reference_tenant ON public.allergen_dish_reference(tenant_id);
CREATE INDEX idx_allergen_conflicts_tenant_status ON public.allergen_conflicts(tenant_id, status);
CREATE INDEX idx_allergen_change_proposals_tenant_status ON public.allergen_change_proposals(tenant_id, status);
CREATE INDEX idx_allergen_course_versions_tenant ON public.allergen_course_versions(tenant_id, version DESC);