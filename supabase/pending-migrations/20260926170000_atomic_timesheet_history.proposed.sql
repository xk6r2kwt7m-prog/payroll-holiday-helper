-- Proposed only. Install on an isolated database and review before shared use.
-- Every change to a time entry writes its history within the same transaction.
-- The audit snapshot deliberately excludes raw GPS coordinates.

ALTER TABLE public.time_entries
  ADD COLUMN approval_review_reason text
    CONSTRAINT time_entries_approval_review_reason_length
    CHECK (approval_review_reason IS NULL OR char_length(approval_review_reason) BETWEEN 10 AND 2000),
  ADD COLUMN approval_mode text
    CONSTRAINT time_entries_approval_mode_valid
    CHECK (approval_mode IS NULL OR approval_mode IN ('approve_single', 'approve_batch_selected', 'approve_batch_daily'));

CREATE FUNCTION public.time_entry_history_snapshot(_row public.time_entries)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'employee_id', _row.employee_id, 'tenant_id', _row.tenant_id,
    'shift_id', _row.shift_id, 'branch', _row.branch, 'department', _row.department,
    'scheduled_start', _row.scheduled_start, 'scheduled_end', _row.scheduled_end,
    'clock_in_time', _row.clock_in_time, 'clock_out_time', _row.clock_out_time,
    'total_hours', _row.total_hours, 'break_minutes', _row.break_minutes,
    'status', _row.status, 'approved_by', _row.approved_by,
    'approved_at', _row.approved_at,
    'approval_mode', _row.approval_mode,
    'manager_adjusted', _row.manager_adjusted,
    'adjusted_by', _row.adjusted_by, 'adjustment_reason', _row.adjustment_reason,
    'manager_override', _row.manager_override, 'override_reason', _row.override_reason,
    'approval_review_reason', _row.approval_review_reason,
    'notes', _row.notes,
    'clock_in_location_recorded', (_row.clock_in_latitude IS NOT NULL AND _row.clock_in_longitude IS NOT NULL),
    'clock_out_location_recorded', (_row.clock_out_latitude IS NOT NULL AND _row.clock_out_longitude IS NOT NULL),
    'clock_in_within_geofence', _row.clock_in_within_geofence,
    'clock_out_within_geofence', _row.clock_out_within_geofence
  )
$$;

REVOKE ALL ON FUNCTION public.time_entry_history_snapshot(public.time_entries)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.audit_time_entry_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_action public.audit_action;
  v_entry_id uuid;
  v_tenant_id uuid;
  v_coordinates_changed boolean := false;
  v_source text := CASE WHEN auth.uid() IS NULL THEN 'server' ELSE 'signed_in_user' END;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_before := public.time_entry_history_snapshot(OLD);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_after := public.time_entry_history_snapshot(NEW);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_coordinates_changed :=
      (OLD.clock_in_latitude, OLD.clock_in_longitude, OLD.clock_out_latitude, OLD.clock_out_longitude)
      IS DISTINCT FROM
      (NEW.clock_in_latitude, NEW.clock_in_longitude, NEW.clock_out_latitude, NEW.clock_out_longitude);
    -- updated_at-only writes do not create duplicate business history.
    IF v_before = v_after AND NOT v_coordinates_changed THEN RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_action := 'delete'; v_entry_id := OLD.id; v_tenant_id := OLD.tenant_id;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'create'; v_entry_id := NEW.id; v_tenant_id := NEW.tenant_id;
  ELSE
    v_entry_id := NEW.id; v_tenant_id := NEW.tenant_id;
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
      v_action := 'approve';
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'rejected' THEN
      v_action := 'reject';
    ELSE
      v_action := 'update';
    END IF;
  END IF;

  INSERT INTO public.audit_log
    (user_id, action, table_name, record_id, tenant_id, old_data, new_data)
  VALUES
    (auth.uid(), v_action, 'time_entries', v_entry_id, v_tenant_id, v_before,
     coalesce(v_after, '{}'::jsonb) || jsonb_build_object(
       'event', 'time_entry_' || lower(TG_OP), 'actor_source', v_source,
       'coordinates_changed', v_coordinates_changed));

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_time_entry_write() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER audit_time_entry_transactionally
  AFTER INSERT OR UPDATE OR DELETE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_time_entry_write();

COMMENT ON FUNCTION public.audit_time_entry_write() IS
  'Fail closed: a time entry write and its minimal, coordinate-free audit row commit or roll back together. Server writes record source=server and no claimed human user_id.';

-- The app and clock service check this before using the new write path.
-- Missing or disabled history means the preview refuses the write.
CREATE FUNCTION public.timesheet_history_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.time_entries'::regclass
      AND tgname = 'audit_time_entry_transactionally'
      AND tgenabled IN ('O', 'A')
      AND NOT tgisinternal
  )
$$;
REVOKE ALL ON FUNCTION public.timesheet_history_ready() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.timesheet_history_ready() TO authenticated, service_role;
