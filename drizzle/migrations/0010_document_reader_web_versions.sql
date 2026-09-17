-- On-screen ("web") reading versions of compliance documents.
-- The original PDF is never replaced: these tables hold a navigable copy plus
-- short comprehension checks that a manager must approve before staff see them.

ALTER TABLE public.compliance_documents
  ADD COLUMN IF NOT EXISTS reader_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS reader_built_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reader_built_version INTEGER,
  ADD COLUMN IF NOT EXISTS reader_error TEXT,
  ADD COLUMN IF NOT EXISTS reader_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.compliance_documents
  ADD CONSTRAINT compliance_documents_reader_status_check
  CHECK (reader_status IN ('none','building','ready','failed')) NOT VALID;

CREATE TABLE IF NOT EXISTS public.document_reader_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
  document_version INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  heading TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  source_page INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_reader_sections TO authenticated;
GRANT ALL ON public.document_reader_sections TO service_role;
ALTER TABLE public.document_reader_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read reading sections"
  ON public.document_reader_sections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = document_reader_sections.tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active
  ));

CREATE POLICY "Managers manage reading sections"
  ON public.document_reader_sections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = document_reader_sections.tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active
      AND tm.role IN ('company_admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = document_reader_sections.tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active
      AND tm.role IN ('company_admin','manager')
  ));

CREATE INDEX IF NOT EXISTS document_reader_sections_doc_idx
  ON public.document_reader_sections (document_id, sort_order);

CREATE TABLE IF NOT EXISTS public.document_reader_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.document_reader_sections(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  origin TEXT NOT NULL DEFAULT 'suggested',
  approval_status TEXT NOT NULL DEFAULT 'suggested',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT document_reader_questions_origin_check CHECK (origin IN ('suggested','manager')),
  CONSTRAINT document_reader_questions_approval_check
    CHECK (approval_status IN ('suggested','approved','rejected'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_reader_questions TO authenticated;
GRANT ALL ON public.document_reader_questions TO service_role;
ALTER TABLE public.document_reader_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read reading questions"
  ON public.document_reader_questions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = document_reader_questions.tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active
  ));

CREATE POLICY "Managers manage reading questions"
  ON public.document_reader_questions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = document_reader_questions.tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active
      AND tm.role IN ('company_admin','manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = document_reader_questions.tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active
      AND tm.role IN ('company_admin','manager')
  ));

CREATE INDEX IF NOT EXISTS document_reader_questions_doc_idx
  ON public.document_reader_questions (document_id, section_id, sort_order);

-- Per-staff reading progress. Written by the induction portal (service role).
CREATE TABLE IF NOT EXISTS public.document_reader_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.document_reader_sections(id) ON DELETE CASCADE,
  employee_id UUID,
  pack_id UUID,
  pack_item_id UUID,
  read_at TIMESTAMPTZ,
  question_id UUID,
  answer_index INTEGER,
  answered_correctly BOOLEAN,
  attempts INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.document_reader_progress TO authenticated;
GRANT ALL ON public.document_reader_progress TO service_role;
ALTER TABLE public.document_reader_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read reading progress"
  ON public.document_reader_progress FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = document_reader_progress.tenant_id
      AND tm.user_id = auth.uid() AND tm.is_active
  ));

CREATE UNIQUE INDEX IF NOT EXISTS document_reader_progress_unique_idx
  ON public.document_reader_progress (pack_item_id, section_id);

CREATE INDEX IF NOT EXISTS document_reader_progress_pack_idx
  ON public.document_reader_progress (pack_id, document_id);