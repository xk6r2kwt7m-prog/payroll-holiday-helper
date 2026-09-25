-- PROPOSED ONLY. Review deployed schema and test on staging before applying.
-- No existing payroll, employee or ledger rows are repaired/backfilled here.
BEGIN;

CREATE TABLE public.holiday_payment_operations (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  request_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  request jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, request_id)
);
ALTER TABLE public.holiday_payment_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.holiday_payment_operations FROM PUBLIC, anon, authenticated;
-- Private server-owned retry receipts. No client policies or write grants.

-- Lock both parents for moves; validate their tenant before any child write.
-- Deleting a parent may cascade after it is no longer visible to this trigger.
CREATE OR REPLACE FUNCTION public.guard_payroll_child_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  old_id uuid; new_id uuid; parent public.payroll_periods%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_id := OLD.payroll_period_id; END IF;
  IF TG_OP <> 'DELETE' THEN new_id := NEW.payroll_period_id; END IF;
  FOR parent IN SELECT * FROM public.payroll_periods
    WHERE id IN (old_id, new_id) ORDER BY id FOR UPDATE
  LOOP
    IF parent.status::text NOT IN ('draft', 'pending', 'rejected') THEN
      RAISE EXCEPTION 'This payroll period is locked. Reopen it before changing entries or holiday payments.' USING ERRCODE = '55000';
    END IF;
    IF (parent.id = old_id AND parent.tenant_id IS DISTINCT FROM OLD.tenant_id)
       OR (parent.id = new_id AND parent.tenant_id IS DISTINCT FROM NEW.tenant_id) THEN
      RAISE EXCEPTION 'Payroll workspace mismatch' USING ERRCODE = '42501';
    END IF;
  END LOOP;
  IF TG_OP <> 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.payroll_periods WHERE id = new_id AND tenant_id = NEW.tenant_id) THEN
      RAISE EXCEPTION 'Payroll period not found in this workspace' USING ERRCODE = '42501';
    END IF;
    IF NEW.employee_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.employees WHERE id = NEW.employee_id AND tenant_id = NEW.tenant_id
    ) THEN RAISE EXCEPTION 'Employee does not belong to this workspace' USING ERRCODE = '42501'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.guard_payroll_child_write() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_approved_payroll_entries ON public.payroll_entries;
CREATE TRIGGER trg_protect_approved_payroll_entries BEFORE INSERT OR UPDATE OR DELETE
  ON public.payroll_entries FOR EACH ROW EXECUTE FUNCTION public.guard_payroll_child_write();
DROP TRIGGER IF EXISTS trg_protect_approved_holiday_payments ON public.holiday_payments;
CREATE TRIGGER trg_protect_approved_holiday_payments BEFORE INSERT OR UPDATE OR DELETE
  ON public.holiday_payments FOR EACH ROW EXECUTE FUNCTION public.guard_payroll_child_write();

-- Both sources update the same locked parent; a move recalculates both parents.
CREATE OR REPLACE FUNCTION public.sync_payroll_period_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE old_id uuid; new_id uuid; pid uuid; worked numeric; holidays numeric;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_id := OLD.payroll_period_id; END IF;
  IF TG_OP <> 'DELETE' THEN new_id := NEW.payroll_period_id; END IF;
  FOR pid IN SELECT id FROM public.payroll_periods WHERE id IN (old_id, new_id) ORDER BY id FOR UPDATE LOOP
    SELECT coalesce(sum(total_pay), 0) INTO worked FROM public.payroll_entries WHERE payroll_period_id = pid;
    SELECT coalesce(sum(total), 0) INTO holidays FROM public.holiday_payments WHERE payroll_period_id = pid;
    UPDATE public.payroll_periods SET timesheet_total = worked, holidays_total = holidays,
      grand_total = worked + holidays WHERE id = pid;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_payroll_period_totals() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_holiday_payment_totals ON public.holiday_payments;
CREATE TRIGGER trg_sync_holiday_payment_totals AFTER INSERT OR UPDATE OR DELETE
  ON public.holiday_payments FOR EACH ROW EXECUTE FUNCTION public.sync_payroll_period_totals();

-- Reopening is a status-only action, not an opportunity to change locked sums.
CREATE OR REPLACE FUNCTION public.protect_approved_payroll_periods()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status::text IN ('approved', 'finalised', 'finalized') THEN
    IF TG_OP = 'UPDATE' AND NEW.status::text = 'draft'
      AND NEW.approved_by IS NULL AND NEW.approved_at IS NULL
      AND (to_jsonb(NEW) - ARRAY['status','approved_by','approved_at','updated_at'])
        = (to_jsonb(OLD) - ARRAY['status','approved_by','approved_at','updated_at']) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'This payroll period is locked. Reopen it separately before editing.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.mutate_holiday_payment_atomic(
  _tenant_id uuid, _request_id uuid, _operation text,
  _payment_id uuid, _values jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  uid uuid := auth.uid(); receipt public.holiday_payment_operations%ROWTYPE;
  previous public.holiday_payments%ROWTYPE; saved public.holiday_payments%ROWTYPE;
  period public.payroll_periods%ROWTYPE; employee public.employees%ROWTYPE;
  pid uuid; eid uuid; request jsonb; result jsonb; ledger_count int;
  h numeric; r numeric; d date; note text; balance numeric; adjustment numeric; basis text;
BEGIN
  IF uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenant_members
      WHERE tenant_id = _tenant_id AND user_id = uid AND is_active AND role::text = 'company_admin') THEN
    RAISE EXCEPTION 'An active company administrator is required for holiday payroll payments.' USING ERRCODE = '42501';
  END IF;
  IF _request_id IS NULL OR _payment_id IS NULL OR _operation IS NULL
      OR _operation NOT IN ('create', 'update', 'delete', 'settle') OR jsonb_typeof(_values) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid holiday payment request' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(_values) k WHERE k NOT IN
    ('employee_id','employee_name','payroll_period_id','hours','rate','total','holiday_taken_date','leave_year_start','leave_year_end','notes','settlement_basis','adjustment_reason','expected_balance')) THEN
    RAISE EXCEPTION 'Unsupported holiday payment field' USING ERRCODE = '22023';
  END IF;
  request := jsonb_build_object('operation', _operation, 'payment_id', _payment_id, 'values', _values);
  -- Same request serialises even if a caller tries to reuse it for another period.
  PERFORM pg_advisory_xact_lock(hashtextextended('holiday-request:' || _tenant_id || ':' || _request_id, 0));
  SELECT * INTO receipt FROM public.holiday_payment_operations WHERE tenant_id = _tenant_id AND request_id = _request_id;
  IF FOUND THEN
    IF receipt.actor_id <> uid OR receipt.request <> request THEN
      RAISE EXCEPTION 'This request ID was used for a different operation' USING ERRCODE = '22023';
    END IF;
    RETURN receipt.result || jsonb_build_object('idempotent_replay', true);
  END IF;
  IF _operation IN ('create','settle') THEN
    pid := (_values->>'payroll_period_id')::uuid;
    eid := (_values->>'employee_id')::uuid;
  ELSE
    SELECT * INTO previous FROM public.holiday_payments WHERE id = _payment_id AND tenant_id = _tenant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Holiday payment not found in this workspace'; END IF;
    -- A settlement also changes entitlement/lifecycle. Ordinary payment edits
    -- must not leave those companion changes behind or permit a second payout.
    IF previous.notes ILIKE '%leaver settlement%' OR EXISTS (
      SELECT 1 FROM public.holiday_payment_operations o WHERE o.tenant_id = _tenant_id
        AND o.request->>'operation' = 'settle' AND o.result->>'payment_id' = _payment_id::text
    ) THEN RAISE EXCEPTION 'Leaver settlements require a reviewed settlement reversal, not an ordinary payment edit.'; END IF;
    pid := previous.payroll_period_id; eid := previous.employee_id;
    IF (_values ? 'payroll_period_id' AND (_values->>'payroll_period_id')::uuid IS DISTINCT FROM pid)
      OR (_values ? 'employee_id' AND (_values->>'employee_id')::uuid IS DISTINCT FROM eid) THEN
      RAISE EXCEPTION 'Moving a holiday payment requires a separate reviewed correction';
    END IF;
  END IF;
  -- Match the period recovery lock order: advisory period, parent row, children.
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll_period:' || pid, 0));
  SELECT * INTO period FROM public.payroll_periods WHERE id = pid AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll period not found in this workspace'; END IF;
  IF period.status::text NOT IN ('draft','pending') THEN
    RAISE EXCEPTION 'Holiday payments require a draft or pending period. Reopen the period first.' USING ERRCODE = '55000';
  END IF;
  IF _operation NOT IN ('create','settle') THEN
    SELECT * INTO saved FROM public.holiday_payments WHERE id = _payment_id AND tenant_id = _tenant_id FOR UPDATE;
    IF NOT FOUND OR saved IS DISTINCT FROM previous THEN
      RAISE EXCEPTION 'The payment changed during this request. Refresh and review it again.' USING ERRCODE = '40001';
    END IF;
  END IF;
  SELECT * INTO employee FROM public.employees WHERE id = eid AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND AND _operation <> 'delete' THEN RAISE EXCEPTION 'Employee not found in this workspace'; END IF;

  -- Refuse ambiguous legacy sources rather than silently removing corrections.
  PERFORM 1 FROM public.holiday_ledger WHERE source_table = 'holiday_payments' AND source_id = _payment_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.holiday_ledger WHERE source_table = 'holiday_payments' AND source_id = _payment_id
    AND (tenant_id IS DISTINCT FROM _tenant_id OR employee_id IS DISTINCT FROM eid OR entry_type::text <> 'holiday_taken')) THEN
    RAISE EXCEPTION 'This payment has historical ledger corrections and needs a reviewed correction.';
  END IF;
  IF _operation NOT IN ('create','settle') AND EXISTS (
    SELECT 1 FROM public.holiday_ledger c JOIN public.holiday_ledger original
      ON c.source_table = 'holiday_ledger' AND c.source_id = original.id
    WHERE original.source_table = 'holiday_payments' AND original.source_id = _payment_id
  ) THEN RAISE EXCEPTION 'A correction refers to this ledger entry; review it before changing the payment.'; END IF;

  IF _operation = 'delete' THEN
    DELETE FROM public.holiday_ledger WHERE source_table = 'holiday_payments' AND source_id = _payment_id AND tenant_id = _tenant_id;
    DELETE FROM public.holiday_payments WHERE id = _payment_id AND tenant_id = _tenant_id;
    result := jsonb_build_object('payment_id', _payment_id, 'employee_id', eid, 'deleted', true);
  ELSE
    h := CASE WHEN _values ? 'hours' THEN (_values->>'hours')::numeric ELSE previous.hours END;
    r := CASE WHEN _values ? 'rate' THEN (_values->>'rate')::numeric ELSE previous.rate END;
    d := CASE WHEN _values ? 'holiday_taken_date' THEN (_values->>'holiday_taken_date')::date ELSE previous.holiday_taken_date END;
    note := CASE WHEN _values ? 'notes' THEN _values->>'notes' ELSE previous.notes END;
    IF h IS NULL OR r IS NULL OR d IS NULL OR NOT isfinite(d) OR h < 0 OR (h = 0 AND _operation <> 'settle') OR r <= 0
      OR h::text IN ('NaN','Infinity','-Infinity') OR r::text IN ('NaN','Infinity','-Infinity')
      OR h <> round(h, 2) OR r <> round(r, 2) THEN
      RAISE EXCEPTION 'Enter a valid date and positive hours/rate with at most two decimal places.' USING ERRCODE = '22023';
    END IF;
    IF _values ? 'total' AND ((_values->>'total')::numeric IS DISTINCT FROM round(h*r, 2)) THEN
      RAISE EXCEPTION 'Payment total does not match hours multiplied by rate.' USING ERRCODE = '22023';
    END IF;
    IF _operation = 'settle' THEN
      basis := _values->>'settlement_basis';
      IF basis IS NULL OR basis NOT IN ('current_year','live_accrual','manual') THEN
        RAISE EXCEPTION 'Settle one verified leave year at a time. Historical years require review.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.holiday_payments WHERE employee_id = eid AND tenant_id = _tenant_id
        AND leave_year_start = date_trunc('year',d)::date AND notes ILIKE '%leaver settlement%')
        OR EXISTS (SELECT 1 FROM public.holiday_payment_operations o WHERE o.tenant_id = _tenant_id
          AND o.request->>'operation' = 'settle' AND o.request->'values'->>'employee_id' = eid::text
          AND left(o.request->'values'->>'holiday_taken_date',4) = extract(year from d)::int::text
          AND (o.result->'payment' = 'null'::jsonb OR EXISTS (SELECT 1 FROM public.holiday_payments hp WHERE hp.id = (o.result->>'payment_id')::uuid))) THEN
        RAISE EXCEPTION 'A settlement already exists for this employee and leave year. Review it before paying again.';
      END IF;
      SELECT coalesce(sum(hours),0) INTO balance FROM public.holiday_ledger
        WHERE employee_id = eid AND tenant_id = _tenant_id AND leave_year_start = date_trunc('year',d)::date;
      IF basis IN ('live_accrual','manual') THEN
        SELECT balance + coalesce(sum(e.holiday_accrued_hours),0) INTO balance
        FROM public.payroll_entries e JOIN public.payroll_periods p ON p.id = e.payroll_period_id
        WHERE e.employee_id = eid AND e.tenant_id = _tenant_id AND p.tenant_id = _tenant_id
          AND p.status::text IN ('draft','pending','rejected')
          AND extract(year from p.start_date) = extract(year from d)
          AND NOT EXISTS (SELECT 1 FROM public.holiday_ledger l WHERE l.source_table = 'payroll_entries'
            AND l.source_id = e.id AND l.entry_type = 'accrual');
      END IF;
      IF NOT (_values ? 'expected_balance') OR (_values->>'expected_balance')::numeric IS DISTINCT FROM round(balance,2) THEN
        RAISE EXCEPTION 'The holiday balance changed or its sources disagree. Refresh and review before settling.' USING ERRCODE = '40001';
      END IF;
      IF basis = 'manual' THEN
        IF nullif(btrim(_values->>'adjustment_reason'),'') IS NULL THEN RAISE EXCEPTION 'A reason is required for a manual adjustment'; END IF;
        adjustment := h - balance;
        IF adjustment <> 0 THEN
          INSERT INTO public.holiday_ledger(employee_id,tenant_id,leave_year_start,entry_date,entry_type,hours,source_table,source_id,notes,created_by)
          VALUES(eid,_tenant_id,date_trunc('year',d)::date,d,'manual_adjustment',adjustment,'holiday_payment_operations',_request_id,
            'Settlement adjustment: ' || (_values->>'adjustment_reason'),uid);
        END IF;
      ELSIF h IS DISTINCT FROM greatest(0,round(balance,2)) THEN
        RAISE EXCEPTION 'Settlement hours do not match the reviewed balance';
      END IF;
      note := 'Leaver settlement (basis: ' || basis || '). ' || coalesce(note,'');
    END IF;
    IF _operation IN ('create','settle') AND h > 0 THEN
      INSERT INTO public.holiday_payments(id, tenant_id, employee_id, employee_name, payroll_period_id,
        hours, rate, total, holiday_taken_date, leave_year_start, leave_year_end, notes)
      VALUES (_payment_id, _tenant_id, eid, concat_ws(' ', employee.forename, employee.surname), pid,
        h, r, round(h*r, 2), d, date_trunc('year', d)::date, (date_trunc('year',d)+interval '1 year - 1 day')::date, note)
      RETURNING * INTO saved;
    ELSIF _operation = 'update' THEN
      UPDATE public.holiday_payments SET hours = h, rate = r, total = round(h*r, 2), holiday_taken_date = d,
        leave_year_start = date_trunc('year',d)::date, leave_year_end = (date_trunc('year',d)+interval '1 year - 1 day')::date, notes = note
        WHERE id = _payment_id AND tenant_id = _tenant_id RETURNING * INTO saved;
    END IF;
    IF h > 0 THEN
    UPDATE public.holiday_ledger SET hours = -saved.hours, amount = -saved.total,
      entry_date = saved.holiday_taken_date, leave_year_start = saved.leave_year_start, notes = saved.notes
      WHERE source_table = 'holiday_payments' AND source_id = saved.id AND entry_type = 'holiday_taken' AND tenant_id = _tenant_id;
    GET DIAGNOSTICS ledger_count = ROW_COUNT;
    IF ledger_count = 0 THEN
      INSERT INTO public.holiday_ledger(employee_id,tenant_id,leave_year_start,entry_date,entry_type,hours,amount,source_table,source_id,notes,created_by)
      VALUES(eid,_tenant_id,saved.leave_year_start,saved.holiday_taken_date,'holiday_taken',-saved.hours,-saved.total,'holiday_payments',saved.id,saved.notes,uid);
    ELSIF ledger_count <> 1 THEN RAISE EXCEPTION 'Ambiguous holiday ledger source'; END IF;
    END IF;
    result := jsonb_build_object('payment_id', _payment_id, 'employee_id', eid, 'payment', CASE WHEN h > 0 THEN to_jsonb(saved) ELSE 'null'::jsonb END);
    IF _operation = 'settle' THEN
      IF employee.status::text <> 'leaver' THEN
        UPDATE public.employees SET status = 'leaver', end_date = d WHERE id = eid AND tenant_id = _tenant_id;
        INSERT INTO public.audit_log(user_id,action,table_name,record_id,tenant_id,old_data,new_data)
        VALUES(uid,'update','employees',eid,_tenant_id,jsonb_build_object('status',employee.status,'end_date',employee.end_date),
          jsonb_build_object('status','leaver','end_date',d,'operation','holiday_settlement','request_id',_request_id));
      END IF;
      result := result || jsonb_build_object('settled',true);
    END IF;
  END IF;
  INSERT INTO public.audit_log(user_id,action,table_name,record_id,tenant_id,old_data,new_data)
    VALUES(uid, CASE _operation WHEN 'create' THEN 'create'::public.audit_action WHEN 'settle' THEN 'create'::public.audit_action WHEN 'delete' THEN 'delete'::public.audit_action ELSE 'update'::public.audit_action END,
      'holiday_payments',_payment_id,_tenant_id,CASE WHEN _operation NOT IN ('create','settle') THEN to_jsonb(previous) END,
      jsonb_build_object('operation', 'holiday_payment_' || _operation, 'request_id', _request_id, 'result', result));
  result := result || jsonb_build_object('idempotent_replay', false);
  INSERT INTO public.holiday_payment_operations(tenant_id,request_id,actor_id,request,result)
    VALUES(_tenant_id,_request_id,uid,request,result);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.mutate_holiday_payment_atomic(uuid,uuid,text,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mutate_holiday_payment_atomic(uuid,uuid,text,uuid,jsonb) TO authenticated;
-- Stops old browser clients from falling back to unsafe multi-request writes.
-- Server maintenance uses service_role; it must still honour the new lock triggers.
REVOKE INSERT, UPDATE, DELETE ON public.holiday_payments FROM PUBLIC, anon, authenticated;
-- Payment-sourced debits are controlled by the transaction, not separate browser writes.
CREATE POLICY holiday_payment_ledger_insert_guard ON public.holiday_ledger AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK ((source_table IS NULL OR source_table NOT IN ('holiday_payments','holiday_payment_operations')));
CREATE POLICY holiday_payment_ledger_update_guard ON public.holiday_ledger AS RESTRICTIVE
  FOR UPDATE TO authenticated USING ((source_table IS NULL OR source_table NOT IN ('holiday_payments','holiday_payment_operations')))
  WITH CHECK ((source_table IS NULL OR source_table NOT IN ('holiday_payments','holiday_payment_operations')));
CREATE POLICY holiday_payment_ledger_delete_guard ON public.holiday_ledger AS RESTRICTIVE
  FOR DELETE TO authenticated USING ((source_table IS NULL OR source_table NOT IN ('holiday_payments','holiday_payment_operations')));
COMMIT;
