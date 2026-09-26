-- PROPOSED ONLY (26 Sep 2026). Release A (read-only payroll period archive). Separate approval.
-- Adds a way to mark a pay period as archived. Archiving never edits the period row:
-- status, name, dates and every stored total (timesheet, incentives, holidays, grand) stay exactly as they are.
-- Once archived, the database refuses every edit, delete or recalculation of the period and its payroll
-- records, whether it comes from a screen, a trigger, the delete/undo action or a server job.
-- There is no un-archive function; reversing needs a reviewed migration (see the rollback file).
-- Installing this archives nothing. Archiving the deprecated February 2026 draft is a separate,
-- approved call to archive_payroll_period (see the release notes).
BEGIN;

CREATE TABLE public.payroll_period_archives (
  payroll_period_id uuid PRIMARY KEY REFERENCES public.payroll_periods(id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  archived_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  archived_by uuid NOT NULL,
  archived_by_name text NOT NULL,
  reason text NOT NULL,
  period_snapshot jsonb NOT NULL,
  child_counts jsonb NOT NULL
);
GRANT SELECT ON public.payroll_period_archives TO authenticated;
GRANT ALL ON public.payroll_period_archives TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.payroll_period_archives FROM PUBLIC, anon, authenticated;
ALTER TABLE public.payroll_period_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_archive_admin_read ON public.payroll_period_archives
  FOR SELECT TO authenticated USING (public.is_tenant_admin(tenant_id));

-- Archive records are permanent evidence: no update or delete, for any role.
CREATE OR REPLACE FUNCTION public.payroll_period_archives_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Payroll archive records are permanent and cannot be changed.' USING ERRCODE = '55000';
END $$;
CREATE TRIGGER trg_payroll_period_archives_immutable BEFORE UPDATE OR DELETE ON public.payroll_period_archives
  FOR EACH ROW EXECUTE FUNCTION public.payroll_period_archives_immutable();
CREATE TRIGGER trg_payroll_period_archives_no_truncate BEFORE TRUNCATE ON public.payroll_period_archives
  FOR EACH STATEMENT EXECUTE FUNCTION public.payroll_period_archives_immutable();

CREATE OR REPLACE FUNCTION public.is_payroll_period_archived(_period_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT _period_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.payroll_period_archives WHERE payroll_period_id = _period_id)
$$;
REVOKE ALL ON FUNCTION public.is_payroll_period_archived(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_payroll_period_archived(uuid) TO authenticated, service_role;

-- 1. The period row itself.
CREATE OR REPLACE FUNCTION public.guard_archived_payroll_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF public.is_payroll_period_archived(OLD.id) THEN
    RAISE EXCEPTION 'This payroll period is archived and read-only. Nothing was changed.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_archived_payroll_period() FROM PUBLIC, anon, authenticated;
-- "a0_" sorts before every other BEFORE trigger, so the refusal happens first.
CREATE TRIGGER a0_guard_archived_payroll_period BEFORE UPDATE OR DELETE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_payroll_period();

-- 2. Records belonging to the period (payroll_period_id column), in either direction of a move.
CREATE OR REPLACE FUNCTION public.guard_archived_payroll_child()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP <> 'INSERT' AND public.is_payroll_period_archived(OLD.payroll_period_id))
     OR (TG_OP <> 'DELETE' AND public.is_payroll_period_archived(NEW.payroll_period_id)) THEN
    RAISE EXCEPTION 'This payroll period is archived and read-only. Nothing was changed.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_archived_payroll_child() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a0_guard_archived_payroll_child BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_payroll_child();
CREATE TRIGGER a0_guard_archived_payroll_child BEFORE INSERT OR UPDATE OR DELETE ON public.holiday_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_payroll_child();
CREATE TRIGGER a0_guard_archived_payroll_child BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_payroll_child();
CREATE TRIGGER a0_guard_archived_payroll_child BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_period_notes
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_payroll_child();
CREATE TRIGGER a0_guard_archived_payroll_child BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_entry_locations
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_payroll_child();
CREATE TRIGGER a0_guard_archived_payroll_child BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_nmw_audit
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_payroll_child();
CREATE TRIGGER a0_guard_archived_payroll_child BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_imports
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_payroll_child();

-- 3. Overpayments raised in the archived period: they cannot be created, removed or moved out,
--    but recording their recovery in a later period stays possible (recovered_in_period_id etc.).
--    Recovery cannot be recorded *into* an archived period.
CREATE OR REPLACE FUNCTION public.guard_archived_payroll_overpayment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP IN ('INSERT','DELETE') THEN
    IF public.is_payroll_period_archived(CASE WHEN TG_OP = 'INSERT' THEN NEW.payroll_period_id ELSE OLD.payroll_period_id END)
       OR (TG_OP = 'INSERT' AND public.is_payroll_period_archived(NEW.recovered_in_period_id)) THEN
      RAISE EXCEPTION 'This payroll period is archived and read-only. Nothing was changed.' USING ERRCODE = '55000';
    END IF;
  ELSIF (NEW.payroll_period_id IS DISTINCT FROM OLD.payroll_period_id
          AND (public.is_payroll_period_archived(OLD.payroll_period_id) OR public.is_payroll_period_archived(NEW.payroll_period_id)))
     OR (NEW.recovered_in_period_id IS DISTINCT FROM OLD.recovered_in_period_id
          AND (public.is_payroll_period_archived(OLD.recovered_in_period_id) OR public.is_payroll_period_archived(NEW.recovered_in_period_id))) THEN
    RAISE EXCEPTION 'This payroll period is archived and read-only. Nothing was changed.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_archived_payroll_overpayment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a0_guard_archived_payroll_overpayment BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_overpayments
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_payroll_overpayment();

-- 4. Holiday ledger rows sourced from the archived period's entries or holiday payments
--    (stops accrual back-fills or payment debits from changing balances through the archive).
CREATE OR REPLACE FUNCTION public.guard_archived_payroll_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r record; pid uuid;
BEGIN
  FOREACH r IN ARRAY CASE TG_OP WHEN 'INSERT' THEN ARRAY[NEW] WHEN 'DELETE' THEN ARRAY[OLD] ELSE ARRAY[OLD, NEW] END LOOP
    pid := NULL;
    IF r.source_table = 'payroll_entries' THEN
      SELECT payroll_period_id INTO pid FROM public.payroll_entries WHERE id = r.source_id;
    ELSIF r.source_table = 'holiday_payments' THEN
      SELECT payroll_period_id INTO pid FROM public.holiday_payments WHERE id = r.source_id;
    END IF;
    IF public.is_payroll_period_archived(pid) THEN
      RAISE EXCEPTION 'This holiday entry belongs to an archived payroll period and is read-only. Nothing was changed.' USING ERRCODE = '55000';
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_archived_payroll_ledger() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a0_guard_archived_payroll_ledger BEFORE INSERT OR UPDATE OR DELETE ON public.holiday_ledger
  FOR EACH ROW EXECUTE FUNCTION public.guard_archived_payroll_ledger();

-- 5. The archive action. Company administrator only; draft/pending/rejected periods only;
--    refuses if the period changed since the admin reviewed it. Writes the archive record and one
--    audit entry in the same transaction; the period row is not touched.
CREATE OR REPLACE FUNCTION public.archive_payroll_period(
  _period_id uuid, _reason text, _archived_by_name text, _expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p public.payroll_periods%ROWTYPE; counts jsonb; existing public.payroll_period_archives%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR nullif(btrim(_reason),'') IS NULL OR nullif(btrim(_archived_by_name),'') IS NULL OR _expected_updated_at IS NULL THEN
    RAISE EXCEPTION 'Sign in and give a reason, your name and the reviewed version of the period' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll_period:' || _period_id, 0));
  SELECT * INTO p FROM public.payroll_periods WHERE id = _period_id FOR SHARE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.tenant_members WHERE tenant_id = p.tenant_id AND user_id = auth.uid()
      AND is_active AND role::text = 'company_admin') THEN
    RAISE EXCEPTION 'An active company administrator is required to archive a payroll period' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO existing FROM public.payroll_period_archives WHERE payroll_period_id = _period_id;
  IF FOUND THEN RETURN jsonb_build_object('payroll_period_id', _period_id, 'already_archived', true, 'archived_at', existing.archived_at); END IF;
  IF p.status::text NOT IN ('draft','pending','rejected') THEN
    RAISE EXCEPTION 'Only unapproved periods can be archived; approved periods are already locked' USING ERRCODE = '55000';
  END IF;
  IF p.updated_at IS DISTINCT FROM _expected_updated_at THEN
    RAISE EXCEPTION 'The period changed since you reviewed it. Reload before archiving.' USING ERRCODE = '40001';
  END IF;
  counts := jsonb_build_object(
    'payroll_entries', (SELECT count(*) FROM public.payroll_entries WHERE payroll_period_id = p.id),
    'holiday_payments', (SELECT count(*) FROM public.holiday_payments WHERE payroll_period_id = p.id),
    'payroll_adjustments', (SELECT count(*) FROM public.payroll_adjustments WHERE payroll_period_id = p.id),
    'payroll_period_notes', (SELECT count(*) FROM public.payroll_period_notes WHERE payroll_period_id = p.id),
    'payroll_entry_locations', (SELECT count(*) FROM public.payroll_entry_locations WHERE payroll_period_id = p.id),
    'payroll_nmw_audit', (SELECT count(*) FROM public.payroll_nmw_audit WHERE payroll_period_id = p.id),
    'payroll_imports', (SELECT count(*) FROM public.payroll_imports WHERE payroll_period_id = p.id),
    'payroll_overpayments', (SELECT count(*) FROM public.payroll_overpayments WHERE payroll_period_id = p.id),
    'audit_log', (SELECT count(*) FROM public.audit_log WHERE record_id = p.id));
  INSERT INTO public.payroll_period_archives(payroll_period_id, tenant_id, archived_by, archived_by_name, reason, period_snapshot, child_counts)
    VALUES (p.id, p.tenant_id, auth.uid(), btrim(_archived_by_name), btrim(_reason), to_jsonb(p), counts);
  INSERT INTO public.audit_log(tenant_id, user_id, action, table_name, record_id, new_data)
    VALUES (p.tenant_id, auth.uid(), 'update', 'payroll_period_archives', p.id,
      jsonb_build_object('operation','archive_payroll_period','reason',btrim(_reason),'archived_by_name',btrim(_archived_by_name),
        'stored_totals', jsonb_build_object('timesheet_total',p.timesheet_total,'incentives_total',p.incentives_total,
          'holidays_total',p.holidays_total,'grand_total',p.grand_total),'child_counts',counts));
  RETURN jsonb_build_object('payroll_period_id', p.id, 'already_archived', false, 'child_counts', counts);
END $$;
REVOKE ALL ON FUNCTION public.archive_payroll_period(uuid,text,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_payroll_period(uuid,text,text,timestamptz) TO authenticated;

COMMIT;
