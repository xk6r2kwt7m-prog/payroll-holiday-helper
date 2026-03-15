
-- ============================================================
-- PHASE 2a: VACANCY + APPLICATION + CONVERSATION SYSTEM
-- Free inbound hiring lane for hospitality
-- ============================================================

-- 1. VACANCY TABLE — employer-owned, publicly browsable when published
CREATE TABLE public.talent_vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  title text NOT NULL,
  description text,
  location text,
  country text,
  employment_type text DEFAULT 'permanent',
  hourly_rate_min numeric,
  hourly_rate_max numeric,
  salary_min numeric,
  salary_max numeric,
  start_date date,
  urgency text DEFAULT 'normal',
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  closes_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_vacancies ENABLE ROW LEVEL SECURITY;

-- Employer CRUD on own vacancies
CREATE POLICY "Tenant admins can manage own vacancies"
ON public.talent_vacancies FOR ALL TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

-- Anyone authenticated can browse published vacancies
CREATE POLICY "Anyone can browse published vacancies"
ON public.talent_vacancies FOR SELECT TO authenticated
USING (status = 'published');

-- 2. APPLICATION TABLE — worker applies to vacancy
CREATE TABLE public.talent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid NOT NULL REFERENCES public.talent_vacancies(id) ON DELETE CASCADE,
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id),
  applicant_user_id uuid NOT NULL,
  cover_message text,
  status text NOT NULL DEFAULT 'applied',
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vacancy_id, talent_profile_id)
);

ALTER TABLE public.talent_applications ENABLE ROW LEVEL SECURITY;

-- Workers can apply (INSERT) and view own applications
CREATE POLICY "Workers can insert own applications"
ON public.talent_applications FOR INSERT TO authenticated
WITH CHECK (applicant_user_id = auth.uid());

CREATE POLICY "Workers can view own applications"
ON public.talent_applications FOR SELECT TO authenticated
USING (applicant_user_id = auth.uid());

CREATE POLICY "Workers can update own applications"
ON public.talent_applications FOR UPDATE TO authenticated
USING (applicant_user_id = auth.uid())
WITH CHECK (applicant_user_id = auth.uid());

-- Vacancy owner can view and update applications to their vacancies
CREATE POLICY "Vacancy owners can view applications"
ON public.talent_applications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.talent_vacancies tv
    WHERE tv.id = talent_applications.vacancy_id
    AND public.is_tenant_admin(tv.tenant_id)
  )
);

CREATE POLICY "Vacancy owners can update application status"
ON public.talent_applications FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.talent_vacancies tv
    WHERE tv.id = talent_applications.vacancy_id
    AND public.is_tenant_admin(tv.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.talent_vacancies tv
    WHERE tv.id = talent_applications.vacancy_id
    AND public.is_tenant_admin(tv.tenant_id)
  )
);

-- 3. CONVERSATION TABLE — thread per application
CREATE TABLE public.talent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type text NOT NULL DEFAULT 'application',
  application_id uuid REFERENCES public.talent_applications(id) ON DELETE CASCADE,
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id),
  employer_tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_conversations ENABLE ROW LEVEL SECURITY;

-- Worker can see own conversations
CREATE POLICY "Workers can view own conversations"
ON public.talent_conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.talent_profiles tp
    JOIN public.employees e ON e.id = tp.employee_id
    WHERE tp.id = talent_conversations.talent_profile_id
    AND e.user_id = auth.uid()
  )
);

-- Employer can see conversations for their tenant
CREATE POLICY "Employers can view own tenant conversations"
ON public.talent_conversations FOR SELECT TO authenticated
USING (public.is_tenant_admin(employer_tenant_id));

-- System creates conversations (via application trigger or direct insert)
CREATE POLICY "Authenticated users can create conversations"
ON public.talent_conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Participants can update conversations"
ON public.talent_conversations FOR UPDATE TO authenticated
USING (
  public.is_tenant_admin(employer_tenant_id)
  OR EXISTS (
    SELECT 1 FROM public.talent_profiles tp
    JOIN public.employees e ON e.id = tp.employee_id
    WHERE tp.id = talent_conversations.talent_profile_id
    AND e.user_id = auth.uid()
  )
);

-- 4. MESSAGE TABLE — individual messages in a conversation
CREATE TABLE public.talent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.talent_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  sender_user_id uuid NOT NULL,
  message_text text,
  message_type text NOT NULL DEFAULT 'text',
  metadata jsonb DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_messages ENABLE ROW LEVEL SECURITY;

-- Conversation participants can read messages
CREATE POLICY "Conversation participants can view messages"
ON public.talent_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.talent_conversations tc
    WHERE tc.id = talent_messages.conversation_id
    AND (
      public.is_tenant_admin(tc.employer_tenant_id)
      OR EXISTS (
        SELECT 1 FROM public.talent_profiles tp
        JOIN public.employees e ON e.id = tp.employee_id
        WHERE tp.id = tc.talent_profile_id
        AND e.user_id = auth.uid()
      )
    )
  )
);

-- Conversation participants can send messages
CREATE POLICY "Conversation participants can send messages"
ON public.talent_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.talent_conversations tc
    WHERE tc.id = talent_messages.conversation_id
    AND (
      public.is_tenant_admin(tc.employer_tenant_id)
      OR EXISTS (
        SELECT 1 FROM public.talent_profiles tp
        JOIN public.employees e ON e.id = tp.employee_id
        WHERE tp.id = tc.talent_profile_id
        AND e.user_id = auth.uid()
      )
    )
  )
);

-- Message read status update
CREATE POLICY "Participants can mark messages read"
ON public.talent_messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.talent_conversations tc
    WHERE tc.id = talent_messages.conversation_id
    AND (
      public.is_tenant_admin(tc.employer_tenant_id)
      OR EXISTS (
        SELECT 1 FROM public.talent_profiles tp
        JOIN public.employees e ON e.id = tp.employee_id
        WHERE tp.id = tc.talent_profile_id
        AND e.user_id = auth.uid()
      )
    )
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.talent_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.talent_conversations;

-- Updated_at triggers
CREATE TRIGGER set_talent_vacancies_updated_at
  BEFORE UPDATE ON public.talent_vacancies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_talent_applications_updated_at
  BEFORE UPDATE ON public.talent_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_talent_conversations_updated_at
  BEFORE UPDATE ON public.talent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
