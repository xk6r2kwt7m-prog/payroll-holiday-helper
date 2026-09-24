-- =============================================================================
-- Atomic deletion and two-hour restoration of DRAFT payroll periods.
--
-- STATUS: PROPOSED — NOT APPLIED. Kept outside supabase/migrations on purpose so
-- nothing installs it before the Admin says "apply it".
--
-- What it adds (additive only — no existing table, column, row or function is
-- changed or removed):
--   * payroll_period_recoveries  — private store of server-built snapshots.
--   * delete_draft_payroll_period(_period_id, _request_id, _reason)
--   * restore_draft_payroll_period(_recovery_id)
--   * list_restorable_payroll_deletions(_tenant_id)
--   * three internal helpers that no app user can call.
--
-- Rules it enforces:
--   1. Only payroll_periods.status = 'draft' can be deleted.
--   2. The snapshot is written by the server into a table no app user can read,
--      insert, update or delete. audit_log receives a summary only.
--   3. Every record that depends on the period is captured and later restored:
--      payroll_entries, payroll_entry_locations, payroll_adjustments,
--      payroll_nmw_audit, payroll_period_notes, holiday_payments,
--      holiday_ledger rows sourced from those entries/payments,
--      payroll_overpayments, and the evidence links of payroll_imports and
--      admin_notes. If an unknown table references any of them, or an
--      overpayment from another period says it was recovered here, deletion is
--      refused before anything changes.
--   4. tenant_id is checked on the period and on every related row, and every
--      employee referenced must belong to the same tenant. Entry-level rows must
--      point at this period's entries; ledger rows at this period's sources.
--   5. A transaction-scoped advisory lock on the period id is always taken
--      first, then rows are locked in one fixed order. Retrying the same
--      request id returns the first result instead of acting twice.
--   6. Original ids, ledger rows and audit history are preserved. After a
--      restore every row is compared with the snapshot; any difference aborts
--      the whole restore. The restore window is two hours.
--   7. Only an active company_admin of the period's own tenant may act.
--      Platform administrators get no extra access here.
--
-- Retention: recovery snapshots are kept PERMANENTLY. They are payroll source
-- records (UK rule: keep at least 3 years after the tax year ends) and the
-- private table refuses deletion. Changing that needs a separate, approved
-- migration.
--
-- Known timestamp behaviour (documented, not hidden):
--   * payroll_periods.updated_at becomes the restore time, because the stored
--     totals are written back with an UPDATE and the existing updated_at
--     trigger always stamps now(). The original value stays in the snapshot.
--   * admin_notes.updated_at: on delete the foreign key sets payroll_period_id
--     to NULL, which fires the existing updated_at trigger; on restore the link
--     is put back with an UPDATE, which fires it again. The note text, status,
--     resolved_at, created_at and author are unchanged; the original
--     updated_at stays in the snapshot. Every other restored row is identical.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Private recovery store
-- ---------------------------------------------------------------------------
CREATE TABLE public.payroll_period_recoveries (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES public.tenants(id),
  period_id          uuid NOT NULL,
  period_name        text NOT NULL,
  request_id         uuid NOT NULL UNIQUE,
  deleted_by         uuid NOT NULL,
  deleted_at         timestamptz NOT NULL DEFAULT now(),
  restore_expires_at timestamptz NOT NULL,
  reason             text,
  counts             jsonb NOT NULL,
  snapshot           jsonb NOT NULL,
  snapshot_sha256    text NOT NULL,
  restored_at        timestamptz,
  restored_by        uuid
);

CREATE INDEX idx_payroll_period_recoveries_tenant
  ON public.payroll_period_recoveries (tenant_id, deleted_at DESC);
CREATE INDEX idx_payroll_period_recoveries_period
  ON public.payroll_period_recoveries (period_id);

REVOKE ALL ON public.payroll_period_recoveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payroll_period_recoveries TO service_role;

ALTER TABLE public.payroll_period_recoveries ENABLE ROW LEVEL SECURITY;
-- No policies: app users can never read or write this table directly.

COMMENT ON TABLE public.payroll_period_recoveries IS
  'Private, permanent snapshots of deleted draft payroll periods. Written and read only by delete_draft_payroll_period / restore_draft_payroll_period.';

CREATE FUNCTION public.payroll_period_recoveries_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'TRUNCATE') THEN
    RAISE EXCEPTION 'Payroll recovery snapshots are permanent and cannot be deleted'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.restored_at IS NOT NULL THEN
    RAISE EXCEPTION 'This recovery has already been restored and is now read-only'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.period_id IS DISTINCT FROM OLD.period_id
     OR NEW.period_name IS DISTINCT FROM OLD.period_name
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.restore_expires_at IS DISTINCT FROM OLD.restore_expires_at
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.counts IS DISTINCT FROM OLD.counts
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.snapshot_sha256 IS DISTINCT FROM OLD.snapshot_sha256 THEN
    RAISE EXCEPTION 'A payroll recovery snapshot cannot be changed; only its restore stamp can be set once'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.restored_at IS NULL OR NEW.restored_by IS NULL THEN
    RAISE EXCEPTION 'A restore must record both the time and the administrator'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payroll_period_recoveries_guard
  BEFORE UPDATE OR DELETE ON public.payroll_period_recoveries
  FOR EACH ROW EXECUTE FUNCTION public.payroll_period_recoveries_guard();

CREATE TRIGGER trg_payroll_period_recoveries_no_truncate
  BEFORE TRUNCATE ON public.payroll_period_recoveries
  FOR EACH STATEMENT EXECUTE FUNCTION public.payroll_period_recoveries_guard();

-- ---------------------------------------------------------------------------
-- 2. Internal helpers (not callable by app users)
-- ---------------------------------------------------------------------------

-- Strict tenant-admin check. Platform administrators are NOT included.
CREATE FUNCTION public.payroll_recovery_is_company_admin(_tenant_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT _tenant_id IS NOT NULL
     AND _user_id IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM public.tenant_members tm
        WHERE tm.tenant_id = _tenant_id
          AND tm.user_id   = _user_id
          AND tm.is_active
          AND tm.role::text = 'company_admin'
     );
$$;

-- Every problem with a snapshot's tenant and link integrity, as plain text.
-- Used before deleting (on the live rows) and again before restoring.
CREATE FUNCTION public.payroll_recovery_snapshot_problems(_snap jsonb, _tenant_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_problems   text[] := '{}';
  v_period_id  text := _snap->'period'->>'id';
  v_tenant     text := _tenant_id::text;
  v_entry_ids  text[];
  v_pay_ids    text[];
  v_key        text;
  v_n          int;
BEGIN
  IF v_period_id IS NULL THEN
    RETURN ARRAY['snapshot has no period'];
  END IF;
  IF (_snap->'period'->>'tenant_id') IS DISTINCT FROM v_tenant THEN
    v_problems := v_problems || 'period belongs to another workspace';
  END IF;

  SELECT coalesce(array_agg(j->>'id'), '{}') INTO v_entry_ids
    FROM jsonb_array_elements(coalesce(_snap->'entries', '[]')) j;
  SELECT coalesce(array_agg(j->>'id'), '{}') INTO v_pay_ids
    FROM jsonb_array_elements(coalesce(_snap->'holidayPayments', '[]')) j;

  FOREACH v_key IN ARRAY ARRAY['entries','entryLocations','holidayPayments','holidayLedger',
                               'notes','adjustments','nmwAudit','overpayments','imports','adminNotes']
  LOOP
    -- tenant on every row
    SELECT count(*) INTO v_n
      FROM jsonb_array_elements(coalesce(_snap->v_key, '[]')) j
     WHERE (j->>'tenant_id') IS DISTINCT FROM v_tenant;
    IF v_n > 0 THEN
      v_problems := v_problems || format('%s: %s row(s) belong to another workspace', v_key, v_n);
    END IF;

    -- every referenced employee belongs to this tenant
    SELECT count(*) INTO v_n
      FROM jsonb_array_elements(coalesce(_snap->v_key, '[]')) j
     WHERE j ? 'employee_id'
       AND (j->>'employee_id') IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.employees e
          WHERE e.id = (j->>'employee_id')::uuid
            AND e.tenant_id = _tenant_id
       );
    IF v_n > 0 THEN
      v_problems := v_problems || format('%s: %s row(s) name a staff member outside this workspace', v_key, v_n);
    END IF;

    -- period link on rows that carry one (imports/admin notes are checked by the caller)
    IF v_key IN ('entries','entryLocations','holidayPayments','notes','adjustments','nmwAudit','overpayments') THEN
      SELECT count(*) INTO v_n
        FROM jsonb_array_elements(coalesce(_snap->v_key, '[]')) j
       WHERE (j->>'payroll_period_id') IS DISTINCT FROM v_period_id;
      IF v_n > 0 THEN
        v_problems := v_problems || format('%s: %s row(s) point at a different period', v_key, v_n);
      END IF;
    END IF;
  END LOOP;

  -- entry-level rows must point at this period's own entries
  SELECT count(*) INTO v_n
    FROM jsonb_array_elements(coalesce(_snap->'entryLocations', '[]')
                           || coalesce(_snap->'adjustments', '[]')) j
   WHERE NOT ((j->>'payroll_entry_id') = ANY (v_entry_ids));
  IF v_n > 0 THEN
    v_problems := v_problems || format('%s location/adjustment row(s) point at an entry of another period', v_n);
  END IF;

  SELECT count(*) INTO v_n
    FROM jsonb_array_elements(coalesce(_snap->'nmwAudit', '[]')) j
   WHERE (j->>'payroll_entry_id') IS NOT NULL
     AND NOT ((j->>'payroll_entry_id') = ANY (v_entry_ids));
  IF v_n > 0 THEN
    v_problems := v_problems || format('%s minimum-wage check row(s) point at an entry of another period', v_n);
  END IF;

  -- ledger rows must come from this period's entries or holiday payments
  SELECT count(*) INTO v_n
    FROM jsonb_array_elements(coalesce(_snap->'holidayLedger', '[]')) j
   WHERE NOT (
     ((j->>'source_table') = 'payroll_entries'  AND (j->>'source_id') = ANY (v_entry_ids)) OR
     ((j->>'source_table') = 'holiday_payments' AND (j->>'source_id') = ANY (v_pay_ids))
   );
  IF v_n > 0 THEN
    v_problems := v_problems || format('%s holiday ledger row(s) are not sourced from this period', v_n);
  END IF;

  RETURN v_problems;
END;
$$;

-- Tables whose foreign keys to the payroll tree are known and handled here.
CREATE FUNCTION public.payroll_recovery_unknown_dependents()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT string_agg(format('%s (%s)', c.conrelid::regclass, c.conname), ', ' ORDER BY c.conname)
    FROM pg_constraint c
   WHERE c.contype = 'f'
     AND c.confrelid IN (
       'public.payroll_periods'::regclass,
       'public.payroll_entries'::regclass,
       'public.payroll_entry_locations'::regclass,
       'public.payroll_adjustments'::regclass,
       'public.payroll_nmw_audit'::regclass,
       'public.payroll_period_notes'::regclass,
       'public.holiday_payments'::regclass,
       'public.payroll_overpayments'::regclass,
       'public.payroll_imports'::regclass,
       'public.admin_notes'::regclass,
       'public.holiday_ledger'::regclass
     )
     AND c.conname NOT IN (
       'payroll_entries_payroll_period_id_fkey',
       'holiday_payments_payroll_period_id_fkey',
       'payroll_imports_payroll_period_id_fkey',
       'admin_notes_payroll_period_id_fkey',
       'payroll_overpayments_payroll_period_id_fkey',
       'payroll_overpayments_recovered_in_period_id_fkey',
       'payroll_entry_locations_payroll_entry_id_fkey',
       'payroll_entry_locations_payroll_period_id_fkey',
       'payroll_adjustments_payroll_period_id_fkey',
       'payroll_adjustments_payroll_entry_id_fkey',
       'payroll_period_notes_payroll_period_id_fkey',
       'payroll_nmw_audit_payroll_period_id_fkey',
       'payroll_nmw_audit_payroll_entry_id_fkey'
     );
$$;

REVOKE ALL ON FUNCTION public.payroll_recovery_is_company_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payroll_recovery_snapshot_problems(jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payroll_recovery_unknown_dependents() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payroll_period_recoveries_guard() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Delete a draft period (atomic, idempotent)
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.delete_draft_payroll_period(
  _period_id  uuid,
  _request_id uuid,
  _reason     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_existing    public.payroll_period_recoveries%ROWTYPE;
  v_period      public.payroll_periods%ROWTYPE;
  v_entry_ids   uuid[];
  v_pay_ids     uuid[];
  v_snapshot    jsonb;
  v_counts      jsonb;
  v_problems    text[];
  v_unknown     text;
  v_recovery_id uuid;
  v_expires     timestamptz := now() + interval '2 hours';
  v_reason      text := nullif(btrim(coalesce(_reason, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to delete a payroll period' USING ERRCODE = '42501';
  END IF;
  IF _period_id IS NULL OR _request_id IS NULL THEN
    RAISE EXCEPTION 'A period and a request id are required' USING ERRCODE = '22023';
  END IF;

  -- Lock order, always: (1) advisory lock on the period id, (2) row locks.
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll_period_recovery:' || _period_id::text, 0));

  -- Idempotent retry: same request id -> same answer, nothing done twice.
  SELECT * INTO v_existing FROM public.payroll_period_recoveries WHERE request_id = _request_id;
  IF FOUND THEN
    IF v_existing.period_id <> _period_id
       OR NOT public.payroll_recovery_is_company_admin(v_existing.tenant_id, v_uid) THEN
      RAISE EXCEPTION 'This request id was already used for a different deletion' USING ERRCODE = '42501';
    END IF;
    RETURN jsonb_build_object(
      'recovery_id', v_existing.id,
      'period_id', v_existing.period_id,
      'counts', v_existing.counts,
      'restore_expires_at', v_existing.restore_expires_at,
      'already_done', true
    );
  END IF;

  SELECT * INTO v_period FROM public.payroll_periods WHERE id = _period_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payroll period not found — it may already have been deleted' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.payroll_recovery_is_company_admin(v_period.tenant_id, v_uid) THEN
    RAISE EXCEPTION 'Only a company administrator of this workspace can delete a payroll period' USING ERRCODE = '42501';
  END IF;
  IF v_period.status::text <> 'draft' THEN
    RAISE EXCEPTION 'Only a draft payroll period can be deleted. This one is %.', v_period.status
      USING ERRCODE = '55000';
  END IF;

  v_unknown := public.payroll_recovery_unknown_dependents();
  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'Deletion refused: records in % depend on payroll and cannot be restored safely', v_unknown
      USING ERRCODE = '55000';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payroll_overpayments
     WHERE recovered_in_period_id = _period_id
       AND payroll_period_id <> _period_id
  ) THEN
    RAISE EXCEPTION 'Deletion refused: an overpayment from another period is recorded as recovered in this period'
      USING ERRCODE = '55000';
  END IF;

  -- Row locks, fixed order.
  PERFORM 1 FROM public.payroll_entries         WHERE payroll_period_id = _period_id ORDER BY id FOR UPDATE;
  SELECT coalesce(array_agg(id ORDER BY id), '{}') INTO v_entry_ids
    FROM public.payroll_entries WHERE payroll_period_id = _period_id;
  PERFORM 1 FROM public.holiday_payments        WHERE payroll_period_id = _period_id ORDER BY id FOR UPDATE;
  SELECT coalesce(array_agg(id ORDER BY id), '{}') INTO v_pay_ids
    FROM public.holiday_payments WHERE payroll_period_id = _period_id;
  PERFORM 1 FROM public.payroll_entry_locations WHERE payroll_period_id = _period_id OR payroll_entry_id = ANY (v_entry_ids) ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.payroll_adjustments     WHERE payroll_period_id = _period_id OR payroll_entry_id = ANY (v_entry_ids) ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.payroll_nmw_audit       WHERE payroll_period_id = _period_id OR payroll_entry_id = ANY (v_entry_ids) ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.payroll_period_notes    WHERE payroll_period_id = _period_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.payroll_overpayments    WHERE payroll_period_id = _period_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.payroll_imports         WHERE payroll_period_id = _period_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.admin_notes             WHERE payroll_period_id = _period_id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.holiday_ledger
   WHERE (source_table = 'payroll_entries'  AND source_id = ANY (v_entry_ids))
      OR (source_table = 'holiday_payments' AND source_id = ANY (v_pay_ids))
   ORDER BY id FOR UPDATE;

  -- Server-built snapshot of everything, ordered by id.
  v_snapshot := jsonb_build_object(
    'version', 1,
    'period', to_jsonb(v_period),
    'entries', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.payroll_entries t
                          WHERE t.payroll_period_id = _period_id), '[]'),
    'entryLocations', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.payroll_entry_locations t
                          WHERE t.payroll_period_id = _period_id OR t.payroll_entry_id = ANY (v_entry_ids)), '[]'),
    'adjustments', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.payroll_adjustments t
                          WHERE t.payroll_period_id = _period_id OR t.payroll_entry_id = ANY (v_entry_ids)), '[]'),
    'nmwAudit', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.payroll_nmw_audit t
                          WHERE t.payroll_period_id = _period_id OR t.payroll_entry_id = ANY (v_entry_ids)), '[]'),
    'notes', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.payroll_period_notes t
                          WHERE t.payroll_period_id = _period_id), '[]'),
    'holidayPayments', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.holiday_payments t
                          WHERE t.payroll_period_id = _period_id), '[]'),
    'holidayLedger', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.holiday_ledger t
                          WHERE (t.source_table = 'payroll_entries'  AND t.source_id = ANY (v_entry_ids))
                             OR (t.source_table = 'holiday_payments' AND t.source_id = ANY (v_pay_ids))), '[]'),
    'overpayments', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.payroll_overpayments t
                          WHERE t.payroll_period_id = _period_id), '[]'),
    'imports', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.payroll_imports t
                          WHERE t.payroll_period_id = _period_id), '[]'),
    'adminNotes', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.admin_notes t
                          WHERE t.payroll_period_id = _period_id), '[]')
  );

  v_problems := public.payroll_recovery_snapshot_problems(v_snapshot, v_period.tenant_id);
  IF coalesce(array_length(v_problems, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Deletion refused, nothing was changed: %', array_to_string(v_problems, '; ')
      USING ERRCODE = '55000';
  END IF;

  v_counts := jsonb_build_object(
    'entries',         jsonb_array_length(v_snapshot->'entries'),
    'entryLocations',  jsonb_array_length(v_snapshot->'entryLocations'),
    'adjustments',     jsonb_array_length(v_snapshot->'adjustments'),
    'nmwAudit',        jsonb_array_length(v_snapshot->'nmwAudit'),
    'notes',           jsonb_array_length(v_snapshot->'notes'),
    'holidayPayments', jsonb_array_length(v_snapshot->'holidayPayments'),
    'holidayLedger',   jsonb_array_length(v_snapshot->'holidayLedger'),
    'overpayments',    jsonb_array_length(v_snapshot->'overpayments'),
    'imports',         jsonb_array_length(v_snapshot->'imports'),
    'adminNotes',      jsonb_array_length(v_snapshot->'adminNotes')
  );

  INSERT INTO public.payroll_period_recoveries
    (tenant_id, period_id, period_name, request_id, deleted_by, restore_expires_at,
     reason, counts, snapshot, snapshot_sha256)
  VALUES
    (v_period.tenant_id, v_period.id, v_period.period_name, _request_id, v_uid, v_expires,
     v_reason, v_counts, v_snapshot,
     encode(sha256(convert_to(v_snapshot::text, 'UTF8')), 'hex'))
  RETURNING id INTO v_recovery_id;

  -- Remove, children first. Ledger rows have no foreign key, so they go explicitly.
  DELETE FROM public.holiday_ledger
   WHERE (source_table = 'payroll_entries'  AND source_id = ANY (v_entry_ids))
      OR (source_table = 'holiday_payments' AND source_id = ANY (v_pay_ids));
  DELETE FROM public.payroll_entry_locations WHERE payroll_period_id = _period_id OR payroll_entry_id = ANY (v_entry_ids);
  DELETE FROM public.payroll_adjustments     WHERE payroll_period_id = _period_id OR payroll_entry_id = ANY (v_entry_ids);
  DELETE FROM public.payroll_nmw_audit       WHERE payroll_period_id = _period_id OR payroll_entry_id = ANY (v_entry_ids);
  DELETE FROM public.payroll_period_notes    WHERE payroll_period_id = _period_id;
  DELETE FROM public.payroll_entries         WHERE payroll_period_id = _period_id;
  DELETE FROM public.holiday_payments        WHERE payroll_period_id = _period_id;
  DELETE FROM public.payroll_overpayments    WHERE payroll_period_id = _period_id;
  -- payroll_imports and admin_notes are kept as evidence; their foreign keys
  -- set payroll_period_id to NULL when the period row goes.
  DELETE FROM public.payroll_periods         WHERE id = _period_id;

  INSERT INTO public.audit_log (user_id, action, table_name, record_id, tenant_id, old_data, new_data)
  VALUES (
    v_uid, 'delete', 'payroll_periods', _period_id, v_period.tenant_id, NULL,
    jsonb_build_object(
      'operation', 'delete_draft_period',
      'recovery_id', v_recovery_id,
      'request_id', _request_id,
      'period_name', v_period.period_name,
      'reason', v_reason,
      'counts', v_counts,
      'deleted_entry_count', v_counts->'entries',
      'restorable_until', v_expires
    )
  );

  RETURN jsonb_build_object(
    'recovery_id', v_recovery_id,
    'period_id', _period_id,
    'counts', v_counts,
    'restore_expires_at', v_expires,
    'already_done', false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Restore within two hours (atomic, idempotent, verified)
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.restore_draft_payroll_period(_recovery_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_period_id uuid;
  r           public.payroll_period_recoveries%ROWTYPE;
  v_snap      jsonb;
  v_problems  text[];
  v_n         int;
  v_item      record;
  v_entry_ids uuid[];
  v_pay_ids   uuid[];
  v_led_ids   uuid[];
  v_cols      text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to restore a payroll period' USING ERRCODE = '42501';
  END IF;

  SELECT period_id INTO v_period_id FROM public.payroll_period_recoveries WHERE id = _recovery_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No recoverable deletion was found' USING ERRCODE = 'P0002';
  END IF;

  -- Same lock order as deletion: advisory lock on the period id first.
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll_period_recovery:' || v_period_id::text, 0));
  SELECT * INTO r FROM public.payroll_period_recoveries WHERE id = _recovery_id FOR UPDATE;

  IF NOT public.payroll_recovery_is_company_admin(r.tenant_id, v_uid) THEN
    RAISE EXCEPTION 'Only a company administrator of this workspace can restore a payroll period' USING ERRCODE = '42501';
  END IF;

  IF r.restored_at IS NOT NULL THEN
    RETURN jsonb_build_object('period_id', r.period_id, 'recovery_id', r.id, 'already_done', true);
  END IF;
  IF now() > r.restore_expires_at THEN
    RAISE EXCEPTION 'The two-hour window to undo this deletion has passed' USING ERRCODE = '55000';
  END IF;

  v_snap := r.snapshot;
  IF encode(sha256(convert_to(v_snap::text, 'UTF8')), 'hex') <> r.snapshot_sha256 THEN
    RAISE EXCEPTION 'Restore refused: the stored snapshot failed its integrity check' USING ERRCODE = '55000';
  END IF;
  IF (v_snap->'period'->>'id') IS DISTINCT FROM r.period_id::text THEN
    RAISE EXCEPTION 'Restore refused: the snapshot does not match this deletion' USING ERRCODE = '55000';
  END IF;

  v_problems := public.payroll_recovery_snapshot_problems(v_snap, r.tenant_id);
  IF coalesce(array_length(v_problems, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Restore refused, nothing was changed: %', array_to_string(v_problems, '; ')
      USING ERRCODE = '55000';
  END IF;

  IF EXISTS (SELECT 1 FROM public.payroll_periods WHERE id = r.period_id) THEN
    RAISE EXCEPTION 'Restore refused: a payroll period with this id already exists' USING ERRCODE = '55000';
  END IF;

  -- Overpayments recovered in another period need that period to still exist here.
  SELECT count(*) INTO v_n
    FROM jsonb_array_elements(v_snap->'overpayments') j
   WHERE (j->>'recovered_in_period_id') IS NOT NULL
     AND (j->>'recovered_in_period_id') <> r.period_id::text
     AND NOT EXISTS (SELECT 1 FROM public.payroll_periods p
                      WHERE p.id = (j->>'recovered_in_period_id')::uuid AND p.tenant_id = r.tenant_id);
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Restore refused: % overpayment(s) were recovered in a period that no longer exists', v_n
      USING ERRCODE = '55000';
  END IF;

  -- Evidence kept at delete time must still be unlinked and in this workspace.
  PERFORM 1 FROM public.payroll_imports
   WHERE id IN (SELECT (j->>'id')::uuid FROM jsonb_array_elements(v_snap->'imports') j) ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.admin_notes
   WHERE id IN (SELECT (j->>'id')::uuid FROM jsonb_array_elements(v_snap->'adminNotes') j) ORDER BY id FOR UPDATE;

  SELECT count(*) INTO v_n
    FROM jsonb_array_elements(v_snap->'imports') j
   WHERE NOT EXISTS (SELECT 1 FROM public.payroll_imports t
                      WHERE t.id = (j->>'id')::uuid AND t.tenant_id = r.tenant_id AND t.payroll_period_id IS NULL);
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Restore refused: % timesheet import record(s) were removed or linked to another period since deletion', v_n
      USING ERRCODE = '55000';
  END IF;
  SELECT count(*) INTO v_n
    FROM jsonb_array_elements(v_snap->'adminNotes') j
   WHERE NOT EXISTS (SELECT 1 FROM public.admin_notes t
                      WHERE t.id = (j->>'id')::uuid AND t.tenant_id = r.tenant_id AND t.payroll_period_id IS NULL);
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Restore refused: % admin note(s) were removed or linked to another period since deletion', v_n
      USING ERRCODE = '55000';
  END IF;

  -- Re-insert with original ids, parents first. Generated columns (for
  -- example payroll_adjustments.delta) are left for the database to compute;
  -- the verification step below proves they come out identical.
  FOR v_item IN
    SELECT * FROM (VALUES
      (1, 'payroll_periods',         jsonb_build_array(v_snap->'period')),
      (2, 'payroll_entries',         v_snap->'entries'),
      (3, 'payroll_entry_locations', v_snap->'entryLocations'),
      (4, 'payroll_adjustments',     v_snap->'adjustments'),
      (5, 'payroll_nmw_audit',       v_snap->'nmwAudit'),
      (6, 'payroll_period_notes',    v_snap->'notes'),
      (7, 'holiday_payments',        v_snap->'holidayPayments'),
      (8, 'payroll_overpayments',    v_snap->'overpayments')
    ) AS v(ord, tbl, rows_json)
    ORDER BY ord
  LOOP
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum) INTO v_cols
      FROM pg_attribute a
     WHERE a.attrelid = ('public.' || v_item.tbl)::regclass
       AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = '';
    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_recordset(NULL::public.%I, $1)',
                   v_item.tbl, v_cols, v_cols, v_item.tbl)
      USING coalesce(v_item.rows_json, '[]');
  END LOOP;

  -- Holiday ledger: remove only rows generated inside this transaction by
  -- existing triggers for these sources, then put the originals back verbatim.
  SELECT coalesce(array_agg((j->>'id')::uuid), '{}') INTO v_entry_ids FROM jsonb_array_elements(v_snap->'entries') j;
  SELECT coalesce(array_agg((j->>'id')::uuid), '{}') INTO v_pay_ids   FROM jsonb_array_elements(v_snap->'holidayPayments') j;
  SELECT coalesce(array_agg((j->>'id')::uuid), '{}') INTO v_led_ids   FROM jsonb_array_elements(v_snap->'holidayLedger') j;
  DELETE FROM public.holiday_ledger
   WHERE created_at = now()
     AND NOT (id = ANY (v_led_ids))
     AND ((source_table = 'payroll_entries'  AND source_id = ANY (v_entry_ids))
       OR (source_table = 'holiday_payments' AND source_id = ANY (v_pay_ids)));
  SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum) INTO v_cols
    FROM pg_attribute a
   WHERE a.attrelid = 'public.holiday_ledger'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = '';
  EXECUTE format('INSERT INTO public.holiday_ledger (%s) SELECT %s FROM jsonb_populate_recordset(NULL::public.holiday_ledger, $1)',
                 v_cols, v_cols)
    USING coalesce(v_snap->'holidayLedger', '[]');

  -- Re-link kept evidence.
  UPDATE public.payroll_imports SET payroll_period_id = r.period_id
   WHERE id IN (SELECT (j->>'id')::uuid FROM jsonb_array_elements(v_snap->'imports') j);
  UPDATE public.admin_notes SET payroll_period_id = r.period_id
   WHERE id IN (SELECT (j->>'id')::uuid FROM jsonb_array_elements(v_snap->'adminNotes') j);

  -- Stored totals back exactly as they were (the totals trigger recalculates on insert).
  UPDATE public.payroll_periods p SET
    timesheet_total  = s.timesheet_total,
    incentives_total = s.incentives_total,
    holidays_total   = s.holidays_total,
    grand_total      = s.grand_total,
    sales_total      = s.sales_total
  FROM jsonb_populate_record(NULL::public.payroll_periods, v_snap->'period') s
  WHERE p.id = r.period_id;

  -- Verify every row is identical to the snapshot; any difference aborts all of it.
  IF (SELECT to_jsonb(p) - 'updated_at' FROM public.payroll_periods p WHERE p.id = r.period_id)
     IS DISTINCT FROM (v_snap->'period') - 'updated_at' THEN
    RAISE EXCEPTION 'Restore refused: the period would not match its snapshot' USING ERRCODE = '55000';
  END IF;

  FOR v_item IN
    SELECT * FROM (VALUES
      ('payroll_entries',         'entries',         '{}'::text[]),
      ('payroll_entry_locations', 'entryLocations',  '{}'::text[]),
      ('payroll_adjustments',     'adjustments',     '{}'::text[]),
      ('payroll_nmw_audit',       'nmwAudit',        '{}'::text[]),
      ('payroll_period_notes',    'notes',           '{}'::text[]),
      ('holiday_payments',        'holidayPayments', '{}'::text[]),
      ('holiday_ledger',          'holidayLedger',   '{}'::text[]),
      ('payroll_overpayments',    'overpayments',    '{}'::text[]),
      ('payroll_imports',         'imports',         '{}'::text[]),
      ('admin_notes',             'adminNotes',      '{updated_at}'::text[])
    ) AS v(tbl, snap_key, ignore_cols)
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM jsonb_array_elements($1) s(j)
        WHERE NOT EXISTS (SELECT 1 FROM public.%I t
                           WHERE t.id = (s.j->>''id'')::uuid
                             AND (to_jsonb(t) - $2) = (s.j - $2))', v_item.tbl)
      INTO v_n USING coalesce(v_snap->v_item.snap_key, '[]'), v_item.ignore_cols;
    IF v_n > 0 THEN
      RAISE EXCEPTION 'Restore refused: % row(s) in % would differ from the snapshot (current rules recalculated them)', v_n, v_item.tbl
        USING ERRCODE = '55000';
    END IF;

    EXECUTE format(
      'SELECT count(*) FROM public.%I t WHERE t.id IN (SELECT (j->>''id'')::uuid FROM jsonb_array_elements($1) j)', v_item.tbl)
      INTO v_n USING coalesce(v_snap->v_item.snap_key, '[]');
    IF v_n <> jsonb_array_length(coalesce(v_snap->v_item.snap_key, '[]')) THEN
      RAISE EXCEPTION 'Restore refused: % row count does not match the snapshot', v_item.tbl USING ERRCODE = '55000';
    END IF;
  END LOOP;

  -- No extra rows were left behind by triggers.
  IF (SELECT count(*) FROM public.payroll_entries WHERE payroll_period_id = r.period_id) <> jsonb_array_length(v_snap->'entries')
     OR (SELECT count(*) FROM public.holiday_ledger
          WHERE (source_table = 'payroll_entries'  AND source_id = ANY (v_entry_ids))
             OR (source_table = 'holiday_payments' AND source_id = ANY (v_pay_ids))) <> jsonb_array_length(v_snap->'holidayLedger') THEN
    RAISE EXCEPTION 'Restore refused: extra rows would be created' USING ERRCODE = '55000';
  END IF;

  UPDATE public.payroll_period_recoveries
     SET restored_at = now(), restored_by = v_uid
   WHERE id = r.id;

  INSERT INTO public.audit_log (user_id, action, table_name, record_id, tenant_id, old_data, new_data)
  VALUES (
    v_uid, 'create', 'payroll_periods', r.period_id, r.tenant_id, NULL,
    jsonb_build_object(
      'operation', 'restore_draft_period',
      'recovery_id', r.id,
      'period_name', r.period_name,
      'counts', r.counts,
      'restored_entry_count', r.counts->'entries'
    )
  );

  RETURN jsonb_build_object('period_id', r.period_id, 'recovery_id', r.id, 'counts', r.counts, 'already_done', false);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. What the "Undo delete" banner may show (metadata only, never the snapshot)
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.list_restorable_payroll_deletions(_tenant_id uuid)
RETURNS TABLE (
  recovery_id        uuid,
  period_id          uuid,
  period_name        text,
  deleted_at         timestamptz,
  restore_expires_at timestamptz,
  reason             text,
  counts             jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.id, r.period_id, r.period_name, r.deleted_at, r.restore_expires_at, r.reason, r.counts
    FROM public.payroll_period_recoveries r
   WHERE r.tenant_id = _tenant_id
     AND public.payroll_recovery_is_company_admin(_tenant_id, auth.uid())
     AND r.restored_at IS NULL
     AND r.restore_expires_at > now()
     AND NOT EXISTS (SELECT 1 FROM public.payroll_periods p WHERE p.id = r.period_id)
   ORDER BY r.deleted_at DESC;
$$;

REVOKE ALL ON FUNCTION public.delete_draft_payroll_period(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_draft_payroll_period(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_restorable_payroll_deletions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_draft_payroll_period(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_draft_payroll_period(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_restorable_payroll_deletions(uuid) TO authenticated;
