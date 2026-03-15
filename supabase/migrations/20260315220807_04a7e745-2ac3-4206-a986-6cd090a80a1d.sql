
-- 1. Evidence Registry for UGLŌ Standard Modules
CREATE TABLE public.training_module_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.training_library(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  evidence_type text NOT NULL DEFAULT 'official_guidance'
    CHECK (evidence_type IN ('official_guidance', 'review_analysis', 'internal_standard', 'incident_pattern', 'mixed')),
  source_title text NOT NULL,
  source_organisation text,
  source_region text,
  source_url text,
  source_notes text,
  confidence_level text NOT NULL DEFAULT 'medium'
    CHECK (confidence_level IN ('high', 'medium', 'low')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Review Insights Data Model
CREATE TABLE public.training_review_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.training_library(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  insight_tag text NOT NULL,
  review_channel text,
  market_scope text,
  summary text NOT NULL,
  operational_problem text,
  customer_impact text,
  suggested_training_response text,
  frequency_level text NOT NULL DEFAULT 'medium'
    CHECK (frequency_level IN ('low', 'medium', 'high')),
  confidence_level text NOT NULL DEFAULT 'medium'
    CHECK (confidence_level IN ('high', 'medium', 'low')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add last_reviewed fields to training_library (non-breaking)
ALTER TABLE public.training_library
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reviewed_by uuid;

-- 4. RLS for training_module_evidence
ALTER TABLE public.training_module_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins full access on evidence"
  ON public.training_module_evidence FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Tenant admins manage own evidence"
  ON public.training_module_evidence FOR ALL
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND public.is_tenant_admin(tenant_id)
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "Tenant members read evidence for their modules"
  ON public.training_module_evidence FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL
    OR public.is_tenant_member(tenant_id)
  );

-- 5. RLS for training_review_insights
ALTER TABLE public.training_review_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins full access on insights"
  ON public.training_review_insights FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Tenant admins manage own insights"
  ON public.training_review_insights FOR ALL
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND public.is_tenant_admin(tenant_id)
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.is_tenant_admin(tenant_id)
  );

CREATE POLICY "Tenant members read insights for their modules"
  ON public.training_review_insights FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL
    OR public.is_tenant_member(tenant_id)
  );

-- 6. Indexes
CREATE INDEX idx_evidence_document ON public.training_module_evidence(document_id);
CREATE INDEX idx_evidence_tenant ON public.training_module_evidence(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_insights_document ON public.training_review_insights(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX idx_insights_tenant ON public.training_review_insights(tenant_id) WHERE tenant_id IS NOT NULL;

-- 7. Updated_at triggers
CREATE TRIGGER update_evidence_updated_at
  BEFORE UPDATE ON public.training_module_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insights_updated_at
  BEFORE UPDATE ON public.training_review_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
