-- A04 proposed: enforce an explicit manager approve_timesheets=false in the
-- database. This file is NOT in supabase/migrations; review and test first.
-- It changes no existing data or table shape.

CREATE FUNCTION public.prevent_disabled_manager_timesheet_writes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_old_tenant uuid;
  v_new_tenant uuid;
BEGIN
  -- Internal service jobs have no end-user auth.uid(). Their own entry points
  -- remain responsible for authentication and authorisation.
  IF auth.uid() IS NULL OR public.is_platform_admin() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP <> 'INSERT' THEN v_old_tenant := OLD.tenant_id; END IF;
  IF TG_OP <> 'DELETE' THEN v_new_tenant := NEW.tenant_id; END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    JOIN public.role_permissions rp
      ON rp.tenant_id = tm.tenant_id
     AND rp.role = 'manager'
     AND rp.permission_key = 'approve_timesheets'
     AND rp.granted = false
    WHERE tm.user_id = auth.uid()
      AND tm.role = 'manager'
      AND tm.is_active = true
      AND tm.tenant_id IN (v_old_tenant, v_new_tenant)
  ) THEN
    RAISE EXCEPTION 'Timesheet changes are disabled for your manager role in this workspace.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_disabled_manager_timesheet_writes() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enforce_manager_timesheet_permission
  BEFORE INSERT OR UPDATE OR DELETE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_disabled_manager_timesheet_writes();

COMMENT ON FUNCTION public.prevent_disabled_manager_timesheet_writes() IS
  'Deny direct timesheet writes by active tenant managers when the manager approve_timesheets permission is explicitly disabled in that workspace. Admin and service jobs keep existing authority.';
