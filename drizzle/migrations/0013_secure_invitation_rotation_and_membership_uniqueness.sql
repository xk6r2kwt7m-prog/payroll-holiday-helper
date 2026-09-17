CREATE UNIQUE INDEX IF NOT EXISTS tenant_invitations_token_unique_idx
  ON public.tenant_invitations (token);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_members_tenant_user_unique_idx
  ON public.tenant_members (tenant_id, user_id);

CREATE OR REPLACE FUNCTION public.rotate_pending_invitation(_invitation_id uuid)
RETURNS TABLE (
  invitation_id uuid,
  email text,
  token text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _tenant_id uuid;
  _email text;
  _status text;
  _accepted_at timestamptz;
  _token text;
  _expires_at timestamptz;
BEGIN
  SELECT ti.tenant_id, ti.email, ti.status, ti.accepted_at
    INTO _tenant_id, _email, _status, _accepted_at
  FROM public.tenant_invitations ti
  WHERE ti.id = _invitation_id
  FOR UPDATE;

  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = _tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('company_admin', 'manager')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have permission to replace this invitation';
  END IF;

  IF _accepted_at IS NOT NULL OR _status = 'accepted' THEN
    RAISE EXCEPTION 'Access already exists. Send a password recovery email instead.';
  END IF;

  _token := encode(gen_random_bytes(32), 'hex');
  _expires_at := now() + interval '7 days';

  UPDATE public.tenant_invitations ti
  SET token = _token,
      expires_at = _expires_at,
      status = 'pending',
      accepted_at = NULL
  WHERE ti.id = _invitation_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, table_name, record_id, new_data)
  VALUES (
    _tenant_id,
    auth.uid(),
    'update',
    'tenant_invitation_link_replaced',
    _invitation_id,
    jsonb_build_object('email', _email, 'expires_at', _expires_at)
  );

  RETURN QUERY SELECT _invitation_id, _email, _token, _expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_pending_invitation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rotate_pending_invitation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rotate_pending_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_pending_invitation(uuid) TO service_role;