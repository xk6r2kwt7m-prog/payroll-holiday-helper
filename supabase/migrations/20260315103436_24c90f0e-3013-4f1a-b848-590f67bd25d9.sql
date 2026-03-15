
-- Fix 1: expire_talent_credits - zero credits_remaining, add audit for unlock/pending expiry
CREATE OR REPLACE FUNCTION public.expire_talent_credits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _expired_purchases integer := 0;
  _expired_unlocks integer := 0;
  _expired_pending integer := 0;
  _rec RECORD;
  _ledger_key text;
  _wallet_balance integer;
BEGIN
  -- Expire PAID purchases past their expiry date
  FOR _rec IN
    SELECT * FROM public.talent_credit_purchases
    WHERE status = 'paid' AND expires_at <= now() AND expired_at IS NULL
    FOR UPDATE
  LOOP
    _ledger_key := 'credit_expired:' || _rec.id::text;

    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.talent_credit_ledger WHERE idempotency_key = _ledger_key
    );

    IF _rec.credits_remaining > 0 THEN
      UPDATE public.talent_credit_wallets
      SET balance = GREATEST(balance - _rec.credits_remaining, 0), updated_at = now()
      WHERE tenant_id = _rec.tenant_id;
    END IF;

    SELECT balance INTO _wallet_balance
    FROM public.talent_credit_wallets
    WHERE tenant_id = _rec.tenant_id;

    -- Zero out credits_remaining to prevent drift
    UPDATE public.talent_credit_purchases
    SET status = 'expired', expired_at = now(), credits_remaining = 0
    WHERE id = _rec.id;

    IF _rec.credits_remaining > 0 THEN
      INSERT INTO public.talent_credit_ledger (
        tenant_id, purchase_id, entry_type, amount, balance_after, reason, idempotency_key
      ) VALUES (
        _rec.tenant_id, _rec.id, 'credit_expired',
        -_rec.credits_remaining, COALESCE(_wallet_balance, 0),
        'Purchase expired (' || _rec.credits_remaining || ' credits lost)', _ledger_key
      );
    ELSE
      -- Still write a zero-amount ledger entry for auditability
      INSERT INTO public.talent_credit_ledger (
        tenant_id, purchase_id, entry_type, amount, balance_after, reason, idempotency_key
      ) VALUES (
        _rec.tenant_id, _rec.id, 'credit_expired',
        0, COALESCE(_wallet_balance, 0),
        'Purchase expired (all credits used)', _ledger_key
      );
    END IF;

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
    UPDATE public.talent_contact_unlocks
    SET candidate_response = 'expired'
    WHERE id = _rec.id AND candidate_response IN ('pending', 'accepted');

    -- Audit log for unlock expiry
    INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
    VALUES ('UPDATE', 'talent_contact_unlocks', _rec.id::text, _rec.tenant_id,
            jsonb_build_object('event', 'unlock_expired', 'talent_profile_id', _rec.talent_profile_id));

    _expired_unlocks := _expired_unlocks + 1;
  END LOOP;

  -- Expire abandoned pending purchases (>1 hour old)
  FOR _rec IN
    SELECT * FROM public.talent_credit_purchases
    WHERE status = 'pending' AND created_at < now() - interval '1 hour'
    FOR UPDATE
  LOOP
    UPDATE public.talent_credit_purchases
    SET status = 'expired', expired_at = now(), credits_remaining = 0
    WHERE id = _rec.id;

    INSERT INTO public.audit_log (action, table_name, record_id, tenant_id, new_data)
    VALUES ('UPDATE', 'talent_credit_purchases', _rec.id::text, _rec.tenant_id,
            jsonb_build_object('event', 'purchase_abandoned', 'age_minutes', EXTRACT(EPOCH FROM (now() - _rec.created_at)) / 60));

    _expired_pending := _expired_pending + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'expired_purchases', _expired_purchases,
    'expired_unlocks', _expired_unlocks,
    'expired_pending', _expired_pending,
    'run_at', now()
  );
END;
$fn$;

-- Fix 2: unlock_talent_contact - add GREATEST protection on wallet decrement
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

  SELECT * INTO _oldest_purchase FROM public.talent_credit_purchases
  WHERE tenant_id = _tenant_id AND status = 'paid' AND credits_remaining > 0 AND expires_at > now()
  ORDER BY created_at ASC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'no_credits', 'balance', 0);
  END IF;

  _validity_days := (SELECT validity_days FROM public.talent_credit_packs WHERE id = _oldest_purchase.pack_id);

  -- Consume credit with GREATEST protection
  UPDATE public.talent_credit_purchases
  SET credits_remaining = GREATEST(credits_remaining - 1, 0)
  WHERE id = _oldest_purchase.id;

  UPDATE public.talent_credit_wallets
  SET balance = GREATEST(balance - 1, 0), updated_at = now()
  WHERE tenant_id = _tenant_id;

  SELECT balance INTO _wallet_balance
  FROM public.talent_credit_wallets WHERE tenant_id = _tenant_id;

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

  _ledger_key := 'credit_consumed:' || _unlock_id::text;
  INSERT INTO public.talent_credit_ledger (
    tenant_id, purchase_id, unlock_id, entry_type, amount, balance_after, reason, idempotency_key
  ) VALUES (
    _tenant_id, _oldest_purchase.id, _unlock_id, 'credit_consumed',
    -1, _wallet_balance,
    'Contact unlock for profile ' || _talent_profile_id::text, _ledger_key
  );

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
