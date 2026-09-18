-- Phase 1 of the Ugly Dumpling Allergen Safety learner system.
-- Additive only: nothing existing is altered. No genuine completion record or
-- certificate is produced by these tables; test activity is flagged and kept apart.

-- 1. Draft course snapshot (proposed version 2). Never published by these tables.
CREATE TABLE public.allergen_course_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  based_on_version INTEGER,
  proposed_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'management_review'
    CHECK (status IN ('management_review', 'superseded', 'withdrawn', 'published')),
  content JSONB NOT NULL,
  source_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  comparison JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmed_dish_ids UUID[] NOT NULL DEFAULT '{}',
  excluded_from_scoring TEXT[] NOT NULL DEFAULT '{}',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.allergen_course_drafts TO authenticated;
GRANT ALL ON public.allergen_course_drafts TO service_role;
ALTER TABLE public.allergen_course_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read allergen course drafts"
  ON public.allergen_course_drafts FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "Managers manage allergen course drafts"
  ON public.allergen_course_drafts FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members
                       WHERE user_id = auth.uid() AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
                       WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));
CREATE INDEX idx_allergen_course_drafts_tenant ON public.allergen_course_drafts(tenant_id, status);

-- 2. Lesson reading progress, saved section by section so a learner can leave and return.
CREATE TABLE public.allergen_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID,
  user_id UUID,
  lesson_ref TEXT NOT NULL,
  course_version INTEGER,
  draft_id UUID REFERENCES public.allergen_course_drafts(id) ON DELETE SET NULL,
  completed_sections TEXT[] NOT NULL DEFAULT '{}',
  total_sections INTEGER NOT NULL DEFAULT 0,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_test BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.allergen_lesson_progress TO authenticated;
GRANT ALL ON public.allergen_lesson_progress TO service_role;
ALTER TABLE public.allergen_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or managed allergen lesson progress"
  ON public.allergen_lesson_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid() AND role IN ('company_admin','manager','supervisor')));
CREATE POLICY "Learners save their own allergen lesson progress"
  ON public.allergen_lesson_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND tenant_id IN
    (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "Learners update their own allergen lesson progress"
  ON public.allergen_lesson_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE UNIQUE INDEX idx_allergen_lesson_progress_unique
  ON public.allergen_lesson_progress(tenant_id, user_id, lesson_ref, is_test);

-- 3. Assessment attempts. Answers are saved while the attempt is open so closing
--    the page does not lose progress. Submitted attempts are kept for ever.
CREATE TABLE public.allergen_assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID,
  user_id UUID,
  attempt_number INTEGER NOT NULL,
  course_version INTEGER,
  draft_id UUID REFERENCES public.allergen_course_drafts(id) ON DELETE SET NULL,
  branch_id UUID,
  question_ids TEXT[] NOT NULL DEFAULT '{}',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  option_order JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_percent NUMERIC(5,2),
  critical_missed TEXT[] NOT NULL DEFAULT '{}',
  passed BOOLEAN,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','submitted','abandoned')),
  outcome TEXT CHECK (outcome IN ('passed_awaiting_practical','failed','manager_coaching_required')),
  submitted_at TIMESTAMPTZ,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.allergen_assessment_attempts TO authenticated;
GRANT ALL ON public.allergen_assessment_attempts TO service_role;
ALTER TABLE public.allergen_assessment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or managed allergen attempts"
  ON public.allergen_assessment_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid() AND role IN ('company_admin','manager','supervisor')));
CREATE POLICY "Learners start their own allergen attempts"
  ON public.allergen_assessment_attempts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND tenant_id IN
    (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "Learners update only an open allergen attempt"
  ON public.allergen_assessment_attempts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'in_progress')
  WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_allergen_attempts_learner
  ON public.allergen_assessment_attempts(tenant_id, user_id, is_test, attempt_number);

-- 4. Manager coaching recorded before a third attempt can be unlocked.
CREATE TABLE public.allergen_coaching_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID,
  user_id UUID,
  after_attempt_id UUID REFERENCES public.allergen_assessment_attempts(id) ON DELETE SET NULL,
  coached_by UUID,
  coached_by_name TEXT,
  coaching_note TEXT NOT NULL,
  topics_covered TEXT[] NOT NULL DEFAULT '{}',
  unlocks_attempt INTEGER NOT NULL DEFAULT 3,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.allergen_coaching_records TO authenticated;
GRANT ALL ON public.allergen_coaching_records TO service_role;
ALTER TABLE public.allergen_coaching_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or managed allergen coaching records"
  ON public.allergen_coaching_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid() AND role IN ('company_admin','manager','supervisor')));
CREATE POLICY "Managers record allergen coaching"
  ON public.allergen_coaching_records FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
              WHERE user_id = auth.uid() AND role IN ('company_admin','manager','supervisor')));
CREATE INDEX idx_allergen_coaching_learner
  ON public.allergen_coaching_records(tenant_id, user_id, is_test);