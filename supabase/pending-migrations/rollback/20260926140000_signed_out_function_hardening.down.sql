-- Restores the previous (unchecked) allocate_contract_reference and signed-out execute access. Counters untouched.
BEGIN;
CREATE OR REPLACE FUNCTION public.allocate_contract_reference(_tenant_id uuid, _prefix text DEFAULT 'UD-EC'::text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _year integer := EXTRACT(YEAR FROM now())::integer;
  _next integer;
BEGIN
  INSERT INTO public.contract_reference_counters (tenant_id, year, last_number)
  VALUES (_tenant_id, _year, 1)
  ON CONFLICT (tenant_id, year)
  DO UPDATE SET last_number = public.contract_reference_counters.last_number + 1
  RETURNING last_number INTO _next;
  RETURN _prefix || '-' || _year::text || '-' || lpad(_next::text, 4, '0');
END;
$function$;
GRANT EXECUTE ON FUNCTION public.allocate_contract_reference(uuid, text), public.employee_sensitive_fields(uuid),
  public.tenant_sensitive_fields(uuid), public.is_locked_contract_object(text) TO anon;
COMMIT;
