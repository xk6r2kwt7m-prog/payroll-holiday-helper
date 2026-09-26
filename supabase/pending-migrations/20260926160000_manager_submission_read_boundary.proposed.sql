-- PROPOSED ONLY. Install with A2 after 20260926110500. No existing data is rewritten.
-- The existing SELECT policy uses the sensitive flag alone. DOB/settlement submissions
-- can have sensitive=false; hiding those rows in React does not prevent disclosure.
BEGIN;
CREATE OR REPLACE FUNCTION public.can_read_staff_review_submission(
 _tenant_id uuid, _employee_id uuid, _field_name text, _sensitive boolean
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.tenant_members m
   JOIN public.employees e ON e.id=_employee_id AND e.tenant_id=m.tenant_id
   WHERE m.tenant_id=_tenant_id AND m.user_id=auth.uid() AND m.is_active
     AND (m.role::text='company_admin' OR (
       m.role::text='manager' AND _sensitive IS FALSE
       AND _field_name IN ('forename','surname','preferred_name','email','nationality')
       AND public.can_view_employee(e.id)
     ))
 )
$$;
REVOKE ALL ON FUNCTION public.can_read_staff_review_submission(uuid,uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_staff_review_submission(uuid,uuid,text,boolean) TO authenticated;
-- Restrictive combines with existing permissive policies using AND, not OR.
CREATE POLICY staff_review_read_boundary ON public.staff_detail_changes AS RESTRICTIVE
 FOR SELECT TO authenticated USING (
   public.can_read_staff_review_submission(tenant_id,employee_id,field_name,sensitive)
 );
COMMIT;
