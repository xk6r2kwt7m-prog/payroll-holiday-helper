-- PROPOSED ONLY (26 Sep 2026). Separate approval. Found while checking functions callable while signed out.
-- allocate_contract_reference had no permission check: anyone (even signed out) could advance any
-- workspace's contract-number counter. Existing counters and issued references are not changed.
BEGIN;
CREATE OR REPLACE FUNCTION public.allocate_contract_reference(_tenant_id uuid, _prefix text DEFAULT 'UD-EC'::text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _year integer := EXTRACT(YEAR FROM now())::integer;
  _next integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_tenant_manager_or_above(_tenant_id) THEN
    RAISE EXCEPTION 'Manager access required to allocate a contract reference' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.contract_reference_counters (tenant_id, year, last_number)
  VALUES (_tenant_id, _year, 1)
  ON CONFLICT (tenant_id, year)
  DO UPDATE SET last_number = public.contract_reference_counters.last_number + 1
  RETURNING last_number INTO _next;
  RETURN _prefix || '-' || _year::text || '-' || lpad(_next::text, 4, '0');
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.allocate_contract_reference(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.employee_sensitive_fields(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tenant_sensitive_fields(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_locked_contract_object(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_contract_reference(uuid, text), public.employee_sensitive_fields(uuid),
  public.tenant_sensitive_fields(uuid), public.is_locked_contract_object(text) TO authenticated, service_role;
COMMIT;
