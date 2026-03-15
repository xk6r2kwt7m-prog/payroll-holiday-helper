
-- ============================================
-- Phase 2c: Billing Hardening Migration
-- ============================================

-- 1. Credit Ledger table for drift-proof wallet balance
CREATE TABLE public.talent_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  purchase_id uuid REFERENCES public.talent_credit_purchases(id),
  unlock_id uuid REFERENCES public.talent_contact_unlocks(id),
  entry_type text NOT NULL, -- 'credit_granted', 'credit_consumed', 'credit_expired', 'credit_refunded'
  amount integer NOT NULL, -- positive for grants, negative for consumption/expiry
  balance_after integer NOT NULL,
  reason text,
  idempotency_key text UNIQUE, -- prevents duplicate ledger entries
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view own ledger"
  ON public.talent_credit_ledger FOR SELECT
  TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE INDEX idx_talent_credit_ledger_tenant ON public.talent_credit_ledger(tenant_id);
CREATE INDEX idx_talent_credit_ledger_purchase ON public.talent_credit_ledger(purchase_id);
CREATE INDEX idx_talent_credit_ledger_idempotency ON public.talent_credit_ledger(idempotency_key);

-- 2. Add status field to talent_credit_purchases if not already rich enough
-- The existing table has 'status' column already but may only have 'active'.
-- Add payment_method and idempotency_key columns
ALTER TABLE public.talent_credit_purchases
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'test',
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz;

-- 3. Create the finalise_talent_purchase RPC
-- This is the SINGLE trusted path for granting credits
CREATE OR REPLACE FUNCTION public.finalise_talent_purchase(
  _purchase_id uuid,
  _new_status text,
  _actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _purchase RECORD;
  _wallet_balance integer;
  _ledger_key text;
BEGIN
  -- 1. Lock and fetch purchase
  SELECT * INTO _purchase
  FROM public.talent_credit_purchases
  WHERE id = _purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  -- 2. Validate status transition
  IF _new_status = 'paid' THEN
    IF _purchase.status != 'pending' THEN
      -- Idempotent: if already paid, return success without double-crediting
      IF _purchase.status = 'paid' THEN
        SELECT balance INTO _wallet_balance
        FROM public.talent_credit_wallets
        WHERE tenant_id = _purchase.tenant_id;
        RETURN jsonb_build_object(
          'purchase_id', _purchase_id,
          'status', 'paid',
          'already_processed', true,
          'wallet_balance', COALESCE(_wallet_balance, 0)
        );
      END IF;
      RAISE EXCEPTION 'Cannot mark as paid: current status is %', _purchase.status;
    END IF;

    -- 3. Build idempotency key
    _ledger_key := 'credit_granted:' || _purchase_id::text;

    -- 4. Check idempotency - if ledger entry exists, skip
    IF EXISTS (SELECT 1 FROM public.talent_credit_ledger WHERE idempotency_key = _ledger_key) THEN
      SELECT balance INTO _wallet_balance
      FROM public.talent_credit_wallets
      WHERE tenant_id = _purchase.tenant_id;
      RETURN jsonb_build_object(
        'purchase_id', _purchase_id,
        'status', 'paid',
        'already_processed', true,
        'wallet_balance', COALESCE(_wallet_balance, 0)
      );
    END IF;

    -- 5. Update purchase status
    UPDATE public.talent_credit_purchases
    SET status = 'paid', paid_at = now(), credits_remaining = credits_purchased
    WHERE id = _purchase_id;

    -- 6. Update wallet
    INSERT INTO public.talent_credit_wallets (tenant_id, balance)
    VALUES (_purchase.tenant_id, _purchase.credits_purchased)
    ON CONFLICT (tenant_id) DO UPDATE
    SET balance = talent_credit_wallets.balance + _purchase.credits_purchased,
        updated_at = now();

    SELECT balance INTO _wallet_balance
    FROM public.talent_credit_wallets
    WHERE tenant_id = _purchase.tenant_id;

    -- 7. Write ledger entry
    INSERT INTO public.talent_credit_ledger (
      tenant_id, purchase_id, entry_type, amount, balance_after, reason, idempotency_key
    ) VALUES (
      _purchase.tenant_id, _purchase_id, 'credit_granted',
      _purchase.credits_purchased, _wallet_balance,
      'Purchase confirmed' || CASE WHEN _purchase.payment_method = 'test' THEN ' (test mode)' ELSE '' END,
      _ledger_key
    );

    -- 8. Audit log
    INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, user_id, new_data)
    VALUES ('INSERT', 'talent_credit_purchases', _purchase_id::text, _purchase.tenant_id,
            COALESCE(_actor_id, auth.uid()),
            jsonb_build_object('event', 'purchase_paid', 'credits', _purchase.credits_purchased, 'method', _purchase.payment_method));

    RETURN jsonb_build_object(
      'purchase_id', _purchase_id,
      'status', 'paid',
      'credits_added', _purchase.credits_purchased,
      'wallet_balance', _wallet_balance,
      'already_processed', false
    );

  ELSIF _new_status IN ('failed', 'cancelled') THEN
    IF _purchase.status NOT IN ('pending') THEN
      RAISE EXCEPTION 'Cannot mark as %: current status is %', _new_status, _purchase.status;
    END IF;

    UPDATE public.talent_credit_purchases
    SET status = _new_status,
        failed_at = CASE WHEN _new_status = 'failed' THEN now() ELSE NULL END,
        cancelled_at = CASE WHEN _new_status = 'cancelled' THEN now() ELSE NULL END
    WHERE id = _purchase_id;

    INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, user_id, new_data)
    VALUES ('UPDATE', 'talent_credit_purchases', _purchase_id::text, _purchase.tenant_id,
            COALESCE(_actor_id, auth.uid()),
            jsonb_build_object('event', 'purchase_' || _new_status));

    RETURN jsonb_build_object('purchase_id', _purchase_id, 'status', _new_status);

  ELSIF _new_status = 'refunded' THEN
    IF _purchase.status != 'paid' THEN
      RAISE EXCEPTION 'Cannot refund: current status is %', _purchase.status;
    END IF;

    _ledger_key := 'credit_refunded:' || _purchase_id::text;

    IF EXISTS (SELECT 1 FROM public.talent_credit_ledger WHERE idempotency_key = _ledger_key) THEN
      RETURN jsonb_build_object('purchase_id', _purchase_id, 'status', 'refunded', 'already_processed', true);
    END IF;

    -- Reverse remaining credits
    UPDATE public.talent_credit_wallets
    SET balance = GREATEST(balance - _purchase.credits_remaining, 0), updated_at = now()
    WHERE tenant_id = _purchase.tenant_id;

    SELECT balance INTO _wallet_balance
    FROM public.talent_credit_wallets
    WHERE tenant_id = _purchase.tenant_id;

    UPDATE public.talent_credit_purchases
    SET status = 'refunded', refunded_at = now()
    WHERE id = _purchase_id;

    INSERT INTO public.talent_credit_ledger (
      tenant_id, purchase_id, entry_type, amount, balance_after, reason, idempotency_key
    ) VALUES (
      _purchase.tenant_id, _purchase_id, 'credit_refunded',
      -_purchase.credits_remaining, COALESCE(_wallet_balance, 0),
      'Purchase refunded', _ledger_key
    );

    INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, user_id, new_data)
    VALUES ('UPDATE', 'talent_credit_purchases', _purchase_id::text, _purchase.tenant_id,
            COALESCE(_actor_id, auth.uid()),
            jsonb_build_object('event', 'purchase_refunded', 'credits_reversed', _purchase.credits_remaining));

    RETURN jsonb_build_object('purchase_id', _purchase_id, 'status', 'refunded', 'credits_reversed', _purchase.credits_remaining, 'wallet_balance', COALESCE(_wallet_balance, 0));

  ELSE
    RAISE EXCEPTION 'Invalid status: %', _new_status;
  END IF;
END;
$fn$;

-- 4. Update purchase_talent_credits to create PENDING purchases (no longer grants credits directly)
CREATE OR REPLACE FUNCTION public.purchase_talent_credits(_pack_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _user_id uuid;
  _tenant_id uuid;
  _pack RECORD;
  _purchase_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT tm.tenant_id INTO _tenant_id
  FROM public.tenant_members tm
  WHERE tm.user_id = _user_id AND tm.role = 'company_admin' AND tm.is_active = true
  LIMIT 1;
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Not a tenant admin'; END IF;

  SELECT * INTO _pack FROM public.talent_credit_packs WHERE id = _pack_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit pack not found'; END IF;

  -- Create PENDING purchase - credits NOT granted yet
  INSERT INTO public.talent_credit_purchases (
    tenant_id, pack_id, credits_purchased, credits_remaining,
    price_paid, price_currency, purchased_by, expires_at,
    status, payment_method, idempotency_key
  ) VALUES (
    _tenant_id, _pack_id, _pack.credits, 0, -- credits_remaining starts at 0 until paid
    _pack.price_amount, _pack.price_currency, _user_id,
    now() + (_pack.validity_days || ' days')::interval,
    'pending', 'test',
    'purchase:' || _tenant_id::text || ':' || gen_random_uuid()::text
  ) RETURNING id INTO _purchase_id;

  -- Audit log
  INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, user_id, new_data)
  VALUES ('INSERT', 'talent_credit_purchases', _purchase_id::text, _tenant_id, _user_id,
          jsonb_build_object('event', 'purchase_created', 'pack_id', _pack_id, 'credits', _pack.credits, 'status', 'pending'));

  RETURN jsonb_build_object(
    'purchase_id', _purchase_id,
    'status', 'pending',
    'credits', _pack.credits,
    'price', _pack.price_amount
  );
END;
$fn$;

-- 5. Expire talent credits function (called by edge function)
CREATE OR REPLACE FUNCTION public.expire_talent_credits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _expired_purchases integer := 0;
  _expired_unlocks integer := 0;
  _rec RECORD;
  _ledger_key text;
  _wallet_balance integer;
BEGIN
  -- Expire purchases past their expiry date
  FOR _rec IN
    SELECT * FROM public.talent_credit_purchases
    WHERE status = 'paid' AND expires_at <= now() AND expired_at IS NULL
    FOR UPDATE
  LOOP
    _ledger_key := 'credit_expired:' || _rec.id::text;

    -- Skip if already processed (idempotency)
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.talent_credit_ledger WHERE idempotency_key = _ledger_key
    );

    -- Reduce wallet by remaining credits
    IF _rec.credits_remaining > 0 THEN
      UPDATE public.talent_credit_wallets
      SET balance = GREATEST(balance - _rec.credits_remaining, 0), updated_at = now()
      WHERE tenant_id = _rec.tenant_id;
    END IF;

    SELECT balance INTO _wallet_balance
    FROM public.talent_credit_wallets
    WHERE tenant_id = _rec.tenant_id;

    UPDATE public.talent_credit_purchases
    SET status = 'expired', expired_at = now()
    WHERE id = _rec.id;

    INSERT INTO public.talent_credit_ledger (
      tenant_id, purchase_id, entry_type, amount, balance_after, reason, idempotency_key
    ) VALUES (
      _rec.tenant_id, _rec.id, 'credit_expired',
      -_rec.credits_remaining, COALESCE(_wallet_balance, 0),
      'Purchase expired', _ledger_key
    );

    INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
    VALUES ('UPDATE', 'talent_credit_purchases', _rec.id::text, _rec.tenant_id,
            jsonb_build_object('event', 'purchase_expired', 'credits_lost', _rec.credits_remaining));

    _expired_purchases := _expired_purchases + 1;
  END LOOP;

  -- Expire contact unlocks past their expiry date
  FOR _rec IN
    SELECT * FROM public.talent_contact_unlocks
    WHERE expires_at <= now() AND candidate_response IN ('pending', 'accepted')
    FOR UPDATE
  LOOP
    -- Mark expired unlocks - no credit impact, just prevents free re-contact
    UPDATE public.talent_contact_unlocks
    SET candidate_response = 'expired'
    WHERE id = _rec.id AND candidate_response IN ('pending', 'accepted');

    _expired_unlocks := _expired_unlocks + 1;
  END LOOP;

  -- Also expire pending purchases older than 1 hour (abandoned)
  UPDATE public.talent_credit_purchases
  SET status = 'expired', expired_at = now()
  WHERE status = 'pending' AND created_at < now() - interval '1 hour';

  RETURN jsonb_build_object(
    'expired_purchases', _expired_purchases,
    'expired_unlocks', _expired_unlocks,
    'run_at', now()
  );
END;
$fn$;

-- 6. Wallet reconciliation function
CREATE OR REPLACE FUNCTION public.reconcile_talent_wallet(_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _calculated_balance integer;
  _current_balance integer;
BEGIN
  -- Calculate true balance from ledger
  SELECT COALESCE(SUM(amount), 0) INTO _calculated_balance
  FROM public.talent_credit_ledger
  WHERE tenant_id = _tenant_id;

  -- Get current cached balance
  SELECT balance INTO _current_balance
  FROM public.talent_credit_wallets
  WHERE tenant_id = _tenant_id;

  -- Update wallet to match ledger truth
  INSERT INTO public.talent_credit_wallets (tenant_id, balance)
  VALUES (_tenant_id, _calculated_balance)
  ON CONFLICT (tenant_id) DO UPDATE
  SET balance = _calculated_balance, updated_at = now();

  -- Log if drift was detected
  IF _current_balance IS NOT NULL AND _current_balance != _calculated_balance THEN
    INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
    VALUES ('UPDATE', 'talent_credit_wallets', _tenant_id::text, _tenant_id,
            jsonb_build_object('event', 'wallet_reconciled', 'old_balance', _current_balance, 'new_balance', _calculated_balance, 'drift', _current_balance - _calculated_balance));
  END IF;

  RETURN jsonb_build_object(
    'tenant_id', _tenant_id,
    'previous_balance', COALESCE(_current_balance, 0),
    'reconciled_balance', _calculated_balance,
    'drift_detected', COALESCE(_current_balance, 0) != _calculated_balance
  );
END;
$fn$;

-- 7. Update unlock_talent_contact to write ledger entries
CREATE OR REPLACE FUNCTION public.unlock_talent_contact(_talent_profile_id uuid, _intro_message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _user_id uuid;
  _tenant_id uuid;
  _existing_unlock RECORD;
  _wallet RECORD;
  _oldest_purchase RECORD;
  _unlock_id uuid;
  _conv_id uuid;
  _profile_exists boolean;
  _is_blocked boolean;
  _validity_days integer;
  _wallet_balance integer;
  _ledger_key text;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT tm.tenant_id INTO _tenant_id
  FROM public.tenant_members tm
  WHERE tm.user_id = _user_id AND tm.role = 'company_admin' AND tm.is_active = true
  LIMIT 1;
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Not a tenant admin'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.talent_profiles
    WHERE id = _talent_profile_id
      AND talent_pool_status IN ('open_to_work', 'available_now', 'available_from_date')
      AND visibility_mode != 'hidden'
  ) INTO _profile_exists;
  IF NOT _profile_exists THEN RAISE EXCEPTION 'Talent profile not found or not visible'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.talent_blocks
    WHERE talent_profile_id = _talent_profile_id AND blocked_tenant_id = _tenant_id
  ) INTO _is_blocked;
  IF _is_blocked THEN RAISE EXCEPTION 'This candidate is not available for contact'; END IF;

  -- Check active unlock (not expired)
  SELECT * INTO _existing_unlock FROM public.talent_contact_unlocks
  WHERE tenant_id = _tenant_id AND talent_profile_id = _talent_profile_id
    AND expires_at > now() AND candidate_response NOT IN ('blocked', 'rejected', 'expired')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'unlock_id', _existing_unlock.id,
      'conversation_id', _existing_unlock.conversation_id,
      'already_unlocked', true,
      'candidate_response', _existing_unlock.candidate_response
    );
  END IF;

  SELECT * INTO _wallet FROM public.talent_credit_wallets WHERE tenant_id = _tenant_id;
  IF NOT FOUND OR _wallet.balance < 1 THEN
    RETURN jsonb_build_object('error', 'no_credits', 'balance', COALESCE(_wallet.balance, 0));
  END IF;

  -- Find oldest PAID purchase with remaining credits that hasn't expired
  SELECT * INTO _oldest_purchase FROM public.talent_credit_purchases
  WHERE tenant_id = _tenant_id AND status = 'paid' AND credits_remaining > 0 AND expires_at > now()
  ORDER BY created_at ASC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'no_credits', 'balance', 0);
  END IF;

  _validity_days := (SELECT validity_days FROM public.talent_credit_packs WHERE id = _oldest_purchase.pack_id);

  -- Consume credit
  UPDATE public.talent_credit_purchases
  SET credits_remaining = credits_remaining - 1
  WHERE id = _oldest_purchase.id;

  UPDATE public.talent_credit_wallets
  SET balance = balance - 1, updated_at = now()
  WHERE tenant_id = _tenant_id;

  SELECT balance INTO _wallet_balance
  FROM public.talent_credit_wallets WHERE tenant_id = _tenant_id;

  -- Create conversation
  INSERT INTO public.talent_conversations (
    conversation_type, talent_profile_id, employer_tenant_id, status
  ) VALUES (
    'outbound', _talent_profile_id, _tenant_id, 'pending_acceptance'
  ) RETURNING id INTO _conv_id;

  INSERT INTO public.talent_contact_unlocks (
    tenant_id, talent_profile_id, purchase_id, conversation_id,
    unlocked_by, expires_at
  ) VALUES (
    _tenant_id, _talent_profile_id, _oldest_purchase.id, _conv_id,
    _user_id, now() + (_validity_days || ' days')::interval
  ) RETURNING id INTO _unlock_id;

  -- Write ledger entry for consumption
  _ledger_key := 'credit_consumed:' || _unlock_id::text;
  INSERT INTO public.talent_credit_ledger (
    tenant_id, purchase_id, unlock_id, entry_type, amount, balance_after, reason, idempotency_key
  ) VALUES (
    _tenant_id, _oldest_purchase.id, _unlock_id, 'credit_consumed',
    -1, _wallet_balance,
    'Contact unlock for profile ' || _talent_profile_id::text, _ledger_key
  );

  -- Audit
  INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, user_id, new_data)
  VALUES ('INSERT', 'talent_contact_unlocks', _unlock_id::text, _tenant_id, _user_id,
          jsonb_build_object('event', 'unlock_created', 'talent_profile_id', _talent_profile_id, 'credits_remaining', _wallet_balance));

  IF _intro_message IS NOT NULL AND _intro_message != '' THEN
    INSERT INTO public.talent_messages (
      conversation_id, sender_type, sender_user_id, message_text, message_type
    ) VALUES (
      _conv_id, 'employer', _user_id, _intro_message, 'outbound_intro'
    );
  END IF;

  RETURN jsonb_build_object(
    'unlock_id', _unlock_id,
    'conversation_id', _conv_id,
    'already_unlocked', false,
    'credits_remaining', _wallet_balance
  );
END;
$fn$;
