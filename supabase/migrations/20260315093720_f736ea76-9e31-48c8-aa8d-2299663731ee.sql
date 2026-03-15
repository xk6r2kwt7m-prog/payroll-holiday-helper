
-- ============================================================
-- ATOMIC APPLY: single transactional RPC for vacancy application
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_to_vacancy(
  _vacancy_id uuid,
  _talent_profile_id uuid,
  _cover_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id uuid;
  _vacancy RECORD;
  _profile RECORD;
  _app_id uuid;
  _conv_id uuid;
BEGIN
  -- 1. Get authenticated user
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Verify vacancy exists and is published
  SELECT id, tenant_id, status INTO _vacancy
  FROM public.talent_vacancies
  WHERE id = _vacancy_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vacancy not found';
  END IF;

  IF _vacancy.status != 'published' THEN
    RAISE EXCEPTION 'Cannot apply — vacancy is not currently published';
  END IF;

  -- 3. Verify talent profile exists and belongs to this user
  SELECT tp.id, tp.employee_id INTO _profile
  FROM public.talent_profiles tp
  JOIN public.employees e ON e.id = tp.employee_id
  WHERE tp.id = _talent_profile_id
    AND e.user_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Talent profile not found or does not belong to you';
  END IF;

  -- 4. Check for duplicate application (unique constraint will also catch, but nicer error)
  IF EXISTS (
    SELECT 1 FROM public.talent_applications
    WHERE vacancy_id = _vacancy_id AND talent_profile_id = _talent_profile_id
  ) THEN
    RAISE EXCEPTION 'You have already applied to this vacancy';
  END IF;

  -- 5. Create application
  INSERT INTO public.talent_applications (
    vacancy_id, talent_profile_id, applicant_user_id, cover_message
  ) VALUES (
    _vacancy_id, _talent_profile_id, _user_id, _cover_message
  ) RETURNING id INTO _app_id;

  -- 6. Create linked conversation
  INSERT INTO public.talent_conversations (
    conversation_type, application_id, talent_profile_id, employer_tenant_id
  ) VALUES (
    'application', _app_id, _talent_profile_id, _vacancy.tenant_id
  ) RETURNING id INTO _conv_id;

  -- 7. Return both IDs
  RETURN jsonb_build_object(
    'application_id', _app_id,
    'conversation_id', _conv_id
  );
END;
$$;
