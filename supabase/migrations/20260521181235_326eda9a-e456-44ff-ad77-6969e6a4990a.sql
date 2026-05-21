
REVOKE EXECUTE ON FUNCTION public.get_active_employment_terms(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_employment_terms(uuid, date) TO authenticated, service_role;
