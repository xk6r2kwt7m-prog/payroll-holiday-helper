-- Phase 2 of the Ugly Dumpling Allergen Safety learner system.
-- Additive only. Nothing existing is altered. The course stays in management
-- review: these tables never publish a version, never send anything, and every
-- row created during testing carries is_test = true.

-- 1. Staff assignment records (management-created; no notification is sent).
CREATE TABLE public.allergen_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID,
  user_id UUID,
  branch_id UUID,
  audience TEXT NOT NULL DEFAULT 'both' CHECK (audience IN ('foh','kitchen','both')),
  course_version INTEGER,
  draft_id UUID REFERENCES public.allergen_course_drafts(id) ON DELETE SET NULL,
  assignment_source TEXT NOT NULL DEFAULT 'management_test'
    CHECK (assignment_source IN ('management_test','direct','role','branch','all_staff','retrain','new_starter')),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','lessons_in_progress','lessons_complete','assessment_in_progress',
                      'manager_coaching_required','passed_awaiting_practical','practical_in_progress',
                      'complete','withdrawn')),
  due_date DATE,
  notification_state TEXT NOT NULL DEFAULT 'manual_only'
    CHECK (notification_state IN ('manual_only','approved_to_send','sent')),
  assigned_by UUID,
  assigned_by_name TEXT,
  note TEXT,
  is_test BOOLEAN NOT NULL DEFAULT false,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.allergen_assignments TO authenticated;
GRANT ALL ON public.allergen_assignments TO service_role;
ALTER TABLE public.allergen_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or managed allergen assignments"
  ON public.allergen_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid() AND role IN ('company_admin','manager','supervisor')));
CREATE POLICY "Managers create allergen assignments"
  ON public.allergen_assignments FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
              WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));
CREATE POLICY "Managers update allergen assignments"
  ON public.allergen_assignments FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid() AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
              WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));
CREATE INDEX idx_allergen_assignments_tenant ON public.allergen_assignments(tenant_id, is_test, status);
CREATE INDEX idx_allergen_assignments_employee ON public.allergen_assignments(tenant_id, employee_id, is_test);

-- 2. Practical manager observation records, item by item, signed by a manager.
CREATE TABLE public.allergen_practical_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  assignment_id UUID REFERENCES public.allergen_assignments(id) ON DELETE SET NULL,
  employee_id UUID,
  user_id UUID,
  branch_id UUID,
  audience TEXT NOT NULL DEFAULT 'both' CHECK (audience IN ('foh','kitchen','both')),
  template_version TEXT NOT NULL DEFAULT 'phase1',
  course_version INTEGER,
  -- { "p01": { "seen": true, "note": "..." }, ... }
  item_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  items_total INTEGER NOT NULL DEFAULT 0,
  items_seen INTEGER NOT NULL DEFAULT 0,
  critical_missed TEXT[] NOT NULL DEFAULT '{}',
  outcome TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (outcome IN ('in_progress','passed','not_yet_competent')),
  observed_on DATE,
  manager_note TEXT,
  signed_by UUID,
  signed_by_name TEXT,
  signed_role TEXT,
  signed_at TIMESTAMPTZ,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.allergen_practical_observations TO authenticated;
GRANT ALL ON public.allergen_practical_observations TO service_role;
ALTER TABLE public.allergen_practical_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or managed allergen observations"
  ON public.allergen_practical_observations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid() AND role IN ('company_admin','manager','supervisor')));
CREATE POLICY "Managers record allergen observations"
  ON public.allergen_practical_observations FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
              WHERE user_id = auth.uid() AND role IN ('company_admin','manager','supervisor')));
CREATE POLICY "Managers update unsigned allergen observations"
  ON public.allergen_practical_observations FOR UPDATE TO authenticated
  USING (signed_at IS NULL AND tenant_id IN (SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid() AND role IN ('company_admin','manager','supervisor')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
              WHERE user_id = auth.uid() AND role IN ('company_admin','manager','supervisor')));
CREATE INDEX idx_allergen_observations_tenant
  ON public.allergen_practical_observations(tenant_id, is_test, outcome);

-- A signed observation is immutable: the audit trail keeps every line as signed.
CREATE OR REPLACE FUNCTION public.protect_signed_allergen_observation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.signed_at IS NOT NULL THEN
    RAISE EXCEPTION 'A signed practical observation cannot be changed. Record a new observation instead.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_signed_allergen_observation
  BEFORE UPDATE ON public.allergen_practical_observations
  FOR EACH ROW EXECUTE FUNCTION public.protect_signed_allergen_observation();

-- 3. Certificates. Only ever created once every gate is met; never auto-sent.
CREATE TABLE public.allergen_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID,
  user_id UUID,
  assignment_id UUID REFERENCES public.allergen_assignments(id) ON DELETE SET NULL,
  attempt_id UUID REFERENCES public.allergen_assessment_attempts(id) ON DELETE SET NULL,
  observation_id UUID REFERENCES public.allergen_practical_observations(id) ON DELETE SET NULL,
  certificate_number TEXT NOT NULL,
  employee_name TEXT,
  branch_id UUID,
  course_title TEXT NOT NULL,
  course_version INTEGER,
  draft_id UUID REFERENCES public.allergen_course_drafts(id) ON DELETE SET NULL,
  score_percent NUMERIC(5,2),
  lessons_completed INTEGER,
  lessons_required INTEGER,
  practical_signed_by_name TEXT,
  practical_signed_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by UUID,
  issued_by_name TEXT,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_on DATE,
  status TEXT NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid','superseded','revoked','expired')),
  superseded_reason TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_state TEXT NOT NULL DEFAULT 'not_sent'
    CHECK (delivery_state IN ('not_sent','approved_to_send','sent')),
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.allergen_certificates TO authenticated;
GRANT ALL ON public.allergen_certificates TO service_role;
ALTER TABLE public.allergen_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or managed allergen certificates"
  ON public.allergen_certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid() AND role IN ('company_admin','manager','supervisor')));
CREATE POLICY "Managers issue allergen certificates"
  ON public.allergen_certificates FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
              WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));
CREATE POLICY "Managers update allergen certificate status"
  ON public.allergen_certificates FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid() AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
              WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));
CREATE UNIQUE INDEX idx_allergen_certificates_number
  ON public.allergen_certificates(tenant_id, certificate_number);
CREATE INDEX idx_allergen_certificates_tenant
  ON public.allergen_certificates(tenant_id, is_test, status, expires_on);

-- The issued facts of a certificate are immutable; only its status, delivery
-- state and superseding reason may ever change.
CREATE OR REPLACE FUNCTION public.protect_issued_allergen_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.certificate_number <> OLD.certificate_number
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
     OR NEW.observation_id IS DISTINCT FROM OLD.observation_id
     OR NEW.course_version IS DISTINCT FROM OLD.course_version
     OR NEW.score_percent IS DISTINCT FROM OLD.score_percent
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
     OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
     OR NEW.evidence::text <> OLD.evidence::text
     OR NEW.is_test IS DISTINCT FROM OLD.is_test THEN
    RAISE EXCEPTION 'An issued allergen certificate cannot be rewritten. Supersede or revoke it and issue a new one.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_issued_allergen_certificate
  BEFORE UPDATE ON public.allergen_certificates
  FOR EACH ROW EXECUTE FUNCTION public.protect_issued_allergen_certificate();

-- 4. Validity and reminder controls. Automatic sending is off by default.
CREATE TABLE public.allergen_renewal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  validity_months INTEGER NOT NULL DEFAULT 12,
  reminder_days_before INTEGER[] NOT NULL DEFAULT '{60,30,7}',
  overdue_reminder_days INTEGER[] NOT NULL DEFAULT '{1,14}',
  automatic_sending_enabled BOOLEAN NOT NULL DEFAULT false,
  new_version_action TEXT NOT NULL DEFAULT 'manager_decides'
    CHECK (new_version_action IN ('manager_decides','stay_valid','supersede','require_retraining')),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.allergen_renewal_settings TO authenticated;
GRANT ALL ON public.allergen_renewal_settings TO service_role;
ALTER TABLE public.allergen_renewal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read allergen renewal settings"
  ON public.allergen_renewal_settings FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));
CREATE POLICY "Managers manage allergen renewal settings"
  ON public.allergen_renewal_settings FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members
         WHERE user_id = auth.uid() AND role IN ('company_admin','manager')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members
              WHERE user_id = auth.uid() AND role IN ('company_admin','manager')));
CREATE UNIQUE INDEX idx_allergen_renewal_settings_tenant
  ON public.allergen_renewal_settings(tenant_id);