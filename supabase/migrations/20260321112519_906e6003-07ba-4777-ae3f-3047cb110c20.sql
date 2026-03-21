
-- Function to link a user to their employee record by matching email.
-- Called from client-side after sign-in/sign-up. SECURITY DEFINER so it
-- can update employees without the caller needing direct UPDATE access.
CREATE OR REPLACE FUNCTION public.link_user_to_employee(_user_id uuid, _email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _employee_id uuid;
  _employee_name text;
BEGIN
  -- Find an unlinked employee with matching email (case-insensitive)
  SELECT id, forename || ' ' || surname
  INTO _employee_id, _employee_name
  FROM public.employees
  WHERE lower(email) = lower(_email)
    AND user_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF _employee_id IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'no_matching_employee');
  END IF;

  -- Link the user to the employee
  UPDATE public.employees
  SET user_id = _user_id
  WHERE id = _employee_id
    AND user_id IS NULL;

  RETURN jsonb_build_object(
    'linked', true,
    'employee_id', _employee_id,
    'employee_name', _employee_name
  );
END;
$$;
