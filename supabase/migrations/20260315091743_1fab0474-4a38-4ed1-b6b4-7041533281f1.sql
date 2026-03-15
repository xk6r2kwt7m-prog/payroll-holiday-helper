
-- Fix overly permissive INSERT policy on talent_conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.talent_conversations;

CREATE POLICY "Application participants can create conversations"
ON public.talent_conversations FOR INSERT TO authenticated
WITH CHECK (
  -- Worker creating for their own application
  EXISTS (
    SELECT 1 FROM public.talent_profiles tp
    JOIN public.employees e ON e.id = tp.employee_id
    WHERE tp.id = talent_conversations.talent_profile_id
    AND e.user_id = auth.uid()
  )
  OR
  -- Employer creating for their own vacancy application
  public.is_tenant_admin(employer_tenant_id)
);
