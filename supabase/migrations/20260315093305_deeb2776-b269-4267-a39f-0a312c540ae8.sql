
-- ============================================================
-- PHASE 2a CRITICAL FIXES: C5, C2, C4, C3 + indexes + unique
-- ============================================================

-- =============================================
-- C5: SENDER TYPE INTEGRITY TRIGGER
-- Prevents employer spoofing worker messages and vice versa
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_talent_message_sender()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _conv RECORD;
  _is_employer boolean;
  _is_worker boolean;
BEGIN
  -- Get conversation context
  SELECT employer_tenant_id, talent_profile_id
  INTO _conv
  FROM public.talent_conversations
  WHERE id = NEW.conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  -- Check if sender is an admin of the employer tenant
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _conv.employer_tenant_id
      AND user_id = NEW.sender_user_id
      AND role = 'company_admin'
      AND is_active = true
  ) INTO _is_employer;

  -- Check if sender is the talent profile owner
  SELECT EXISTS (
    SELECT 1 FROM public.talent_profiles tp
    JOIN public.employees e ON e.id = tp.employee_id
    WHERE tp.id = _conv.talent_profile_id
      AND e.user_id = NEW.sender_user_id
  ) INTO _is_worker;

  -- Validate sender_type matches reality
  IF NEW.sender_type = 'employer' AND NOT _is_employer THEN
    RAISE EXCEPTION 'sender_type "employer" does not match authenticated user role in this conversation';
  END IF;

  IF NEW.sender_type = 'worker' AND NOT _is_worker THEN
    RAISE EXCEPTION 'sender_type "worker" does not match authenticated user role in this conversation';
  END IF;

  -- Must be one or the other
  IF NOT _is_employer AND NOT _is_worker THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_talent_message_sender
  BEFORE INSERT ON public.talent_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_talent_message_sender();

-- =============================================
-- C2: MESSAGE UPDATE LOCKDOWN
-- Remove broad UPDATE policy, replace with read_at-only RPC
-- =============================================
DROP POLICY IF EXISTS "Participants can mark messages read" ON public.talent_messages;

-- No UPDATE policy at all — updates go through RPC only
-- Create security definer function for marking messages read
CREATE OR REPLACE FUNCTION public.mark_talent_messages_read(
  _conversation_id uuid,
  _reader_sender_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _conv RECORD;
  _is_participant boolean := false;
BEGIN
  -- Get conversation
  SELECT employer_tenant_id, talent_profile_id
  INTO _conv
  FROM public.talent_conversations
  WHERE id = _conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  -- Verify caller is a participant
  -- If reader is employer, they mark worker messages as read
  IF _reader_sender_type = 'worker' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE tenant_id = _conv.employer_tenant_id
        AND user_id = auth.uid()
        AND role = 'company_admin'
        AND is_active = true
    ) INTO _is_participant;
  ELSIF _reader_sender_type = 'employer' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      JOIN public.employees e ON e.id = tp.employee_id
      WHERE tp.id = _conv.talent_profile_id
        AND e.user_id = auth.uid()
    ) INTO _is_participant;
  END IF;

  IF NOT _is_participant THEN
    RAISE EXCEPTION 'Not a participant in this conversation';
  END IF;

  -- Only update read_at on messages from the other party
  UPDATE public.talent_messages
  SET read_at = now()
  WHERE conversation_id = _conversation_id
    AND sender_type = _reader_sender_type
    AND read_at IS NULL
    AND sender_user_id != auth.uid();
END;
$$;

-- =============================================
-- C4: APPLICATION INSERT GUARD
-- Only allow applications to published vacancies
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_talent_application_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _vacancy_status text;
BEGIN
  SELECT status INTO _vacancy_status
  FROM public.talent_vacancies
  WHERE id = NEW.vacancy_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vacancy not found';
  END IF;

  IF _vacancy_status != 'published' THEN
    RAISE EXCEPTION 'Cannot apply to a vacancy that is not published (current status: %)', _vacancy_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_talent_application_insert
  BEFORE INSERT ON public.talent_applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_talent_application_insert();

-- =============================================
-- C3: CONVERSATION INTEGRITY
-- application_id required for application-type conversations
-- unique per application
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_talent_conversation_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.conversation_type = 'application' AND NEW.application_id IS NULL THEN
    RAISE EXCEPTION 'Application-type conversations must reference a valid application_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_talent_conversation_insert
  BEFORE INSERT ON public.talent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.validate_talent_conversation_insert();

-- Unique constraint: one conversation per application
CREATE UNIQUE INDEX idx_talent_conversations_application_unique
  ON public.talent_conversations (application_id)
  WHERE application_id IS NOT NULL;

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================
CREATE INDEX idx_talent_messages_conversation_id ON public.talent_messages (conversation_id);
CREATE INDEX idx_talent_messages_unread ON public.talent_messages (conversation_id, sender_type) WHERE read_at IS NULL;
CREATE INDEX idx_talent_applications_vacancy_id ON public.talent_applications (vacancy_id);
CREATE INDEX idx_talent_applications_applicant_user_id ON public.talent_applications (applicant_user_id);
CREATE INDEX idx_talent_conversations_employer_tenant_id ON public.talent_conversations (employer_tenant_id);
CREATE INDEX idx_talent_conversations_talent_profile_id ON public.talent_conversations (talent_profile_id);
