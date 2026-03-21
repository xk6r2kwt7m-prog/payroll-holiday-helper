
CREATE OR REPLACE FUNCTION public.link_user_to_employee(_user_id uuid, _email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _match_count integer;
  _employee_id uuid;
  _employee_name text;
BEGIN
  SELECT count(*) INTO _match_count
  FROM public.employees
  WHERE lower(email) = lower(_email)
    AND user_id IS NULL;

  IF _match_count = 0 THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'no_matching_employee');
  END IF;

  IF _match_count > 1 THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'ambiguous_multiple_matches', 'match_count', _match_count);
  END IF;

  SELECT id, forename || ' ' || surname
  INTO _employee_id, _employee_name
  FROM public.employees
  WHERE lower(email) = lower(_email)
    AND user_id IS NULL
  LIMIT 1;

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
