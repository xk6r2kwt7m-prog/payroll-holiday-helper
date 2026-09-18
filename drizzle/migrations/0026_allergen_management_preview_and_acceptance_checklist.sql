-- Phase 4: management-only learner preview sessions and the hands-on acceptance checklist.
-- Additive only. Nothing existing is altered, nothing is published, assigned, sent or certified.

-- 1. preview_key scopes an isolated management preview session (one per persona).
--    A NULL preview_key means an ordinary record and is never touched by preview tools.
ALTER TABLE public.allergen_lesson_progress ADD COLUMN IF NOT EXISTS preview_key TEXT;
ALTER TABLE public.allergen_assessment_attempts ADD COLUMN IF NOT EXISTS preview_key TEXT;
ALTER TABLE public.allergen_coaching_records ADD COLUMN IF NOT EXISTS preview_key TEXT;
ALTER TABLE public.allergen_practical_observations ADD COLUMN IF NOT EXISTS preview_key TEXT;
ALTER TABLE public.allergen_certificates ADD COLUMN IF NOT EXISTS preview_key TEXT;
ALTER TABLE public.allergen_assignments ADD COLUMN IF NOT EXISTS preview_key TEXT;

CREATE INDEX IF NOT EXISTS idx_allergen_lesson_progress_preview
  ON public.allergen_lesson_progress(tenant_id, preview_key) WHERE preview_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_allergen_attempts_preview
  ON public.allergen_assessment_attempts(tenant_id, preview_key) WHERE preview_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_allergen_observations_preview
  ON public.allergen_practical_observations(tenant_id, preview_key) WHERE preview_key IS NOT NULL;

-- 2. A preview session may only ever be cleared where the row is test activity AND
--    belongs to a named preview session. Genuine records cannot be deleted by this route.
GRANT DELETE ON public.allergen_lesson_progress TO authenticated;
GRANT DELETE ON public.allergen_assessment_attempts TO authenticated;
GRANT DELETE ON public.allergen_coaching_records TO authenticated;
GRANT DELETE ON public.allergen_practical_observations TO authenticated;
GRANT DELETE ON public.allergen_certificates TO authenticated;

CREATE POLICY "Managers clear preview lesson progress only"
  ON public.allergen_lesson_progress FOR DELETE TO authenticated
  USING (is_test = true AND preview_key IS NOT NULL
         AND tenant_id IN (SELECT tenant_id FROM public.tenant_members
                           WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));

CREATE POLICY "Managers clear preview attempts only"
  ON public.allergen_assessment_attempts FOR DELETE TO authenticated
  USING (is_test = true AND preview_key IS NOT NULL
         AND tenant_id IN (SELECT tenant_id FROM public.tenant_members
                           WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));

CREATE POLICY "Managers clear preview coaching only"
  ON public.allergen_coaching_records FOR DELETE TO authenticated
  USING (is_test = true AND preview_key IS NOT NULL
         AND tenant_id IN (SELECT tenant_id FROM public.tenant_members
                           WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));

CREATE POLICY "Managers clear preview observations only"
  ON public.allergen_practical_observations FOR DELETE TO authenticated
  USING (is_test = true AND preview_key IS NOT NULL
         AND tenant_id IN (SELECT tenant_id FROM public.tenant_members
                           WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));

CREATE POLICY "Managers clear preview certificates only"
  ON public.allergen_certificates FOR DELETE TO authenticated
  USING (is_test = true AND preview_key IS NOT NULL
         AND tenant_id IN (SELECT tenant_id FROM public.tenant_members
                           WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));

-- 3. The hands-on acceptance checklist management completes and signs.
CREATE TABLE public.allergen_acceptance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  environment TEXT NOT NULL
    CHECK (environment IN ('smartphone','desktop','keyboard_only','screen_reader','interrupted_connection')),
  check_ref TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass','pass_with_observation','fail','not_tested')),
  comment TEXT,
  checked_by UUID,
  checked_by_name TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A failure or an untested check must carry an explanation.
  CONSTRAINT allergen_acceptance_comment_required
    CHECK (result IN ('pass','pass_with_observation') OR (comment IS NOT NULL AND length(btrim(comment)) > 0))
);
CREATE UNIQUE INDEX idx_allergen_acceptance_checks_unique
  ON public.allergen_acceptance_checks(tenant_id, environment, check_ref);
GRANT SELECT, INSERT, UPDATE ON public.allergen_acceptance_checks TO authenticated;
GRANT ALL ON public.allergen_acceptance_checks TO service_role;
ALTER TABLE public.allergen_acceptance_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read allergen acceptance checks"
  ON public.allergen_acceptance_checks FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "Managers record allergen acceptance checks"
  ON public.allergen_acceptance_checks FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members
                       WHERE user_id = auth.uid() AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
                       WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));

-- 4. The management signature for each tested environment. Signed rows are kept for the audit trail.
CREATE TABLE public.allergen_acceptance_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  environment TEXT NOT NULL
    CHECK (environment IN ('smartphone','desktop','keyboard_only','screen_reader','interrupted_connection')),
  device_note TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted','accepted_with_observations','not_accepted')),
  signed_by UUID,
  signed_by_name TEXT NOT NULL,
  signed_role TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.allergen_acceptance_signoffs TO authenticated;
GRANT ALL ON public.allergen_acceptance_signoffs TO service_role;
ALTER TABLE public.allergen_acceptance_signoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read allergen acceptance signoffs"
  ON public.allergen_acceptance_signoffs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "Managers sign allergen acceptance"
  ON public.allergen_acceptance_signoffs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
                       WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));