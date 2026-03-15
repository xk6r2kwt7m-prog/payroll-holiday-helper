
-- ============================================================
-- Phase 2b: Paid outbound contact for passive Talent Pool candidates
-- ============================================================

-- A1. Credit packs (product catalog)
CREATE TABLE public.talent_credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price_amount numeric(10,2) NOT NULL,
  price_currency text NOT NULL DEFAULT 'GBP',
  validity_days integer NOT NULL DEFAULT 7,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.talent_credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active credit packs" ON public.talent_credit_packs
  FOR SELECT USING (is_active = true);

-- A2. Credit wallets (per tenant)
CREATE TABLE public.talent_credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);
ALTER TABLE public.talent_credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins can read own wallet" ON public.talent_credit_wallets
  FOR SELECT TO authenticated USING (public.is_tenant_admin(tenant_id));

-- A3. Credit purchases (audit trail)
CREATE TABLE public.talent_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pack_id uuid NOT NULL REFERENCES public.talent_credit_packs(id),
  credits_purchased integer NOT NULL,
  credits_remaining integer NOT NULL,
  price_paid numeric(10,2) NOT NULL,
  price_currency text NOT NULL DEFAULT 'GBP',
  purchased_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  stripe_payment_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.talent_credit_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins can read own purchases" ON public.talent_credit_purchases
  FOR SELECT TO authenticated USING (public.is_tenant_admin(tenant_id));

-- A4. Contact unlocks (per tenant + candidate pair)
CREATE TABLE public.talent_contact_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id),
  purchase_id uuid REFERENCES public.talent_credit_purchases(id),
  conversation_id uuid,
  unlocked_by uuid NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  candidate_response text NOT NULL DEFAULT 'pending',
  candidate_responded_at timestamptz,
  blocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.talent_contact_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can read own unlocks" ON public.talent_contact_unlocks
  FOR SELECT TO authenticated USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Workers can see their own contact requests" ON public.talent_contact_unlocks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      JOIN public.employees e ON e.id = tp.employee_id
      WHERE tp.id = talent_profile_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can respond to contact requests" ON public.talent_contact_unlocks
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      JOIN public.employees e ON e.id = tp.employee_id
      WHERE tp.id = talent_profile_id AND e.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      JOIN public.employees e ON e.id = tp.employee_id
      WHERE tp.id = talent_profile_id AND e.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_unlocks_tenant ON public.talent_contact_unlocks (tenant_id);
CREATE INDEX idx_unlocks_profile ON public.talent_contact_unlocks (talent_profile_id);
CREATE INDEX idx_unlocks_active ON public.talent_contact_unlocks (tenant_id, talent_profile_id, expires_at);
CREATE INDEX idx_purchases_tenant ON public.talent_credit_purchases (tenant_id);
CREATE INDEX idx_credit_wallets_tenant ON public.talent_credit_wallets (tenant_id);

-- A5. Tenant-level block list
CREATE TABLE public.talent_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id),
  blocked_tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(talent_profile_id, blocked_tenant_id)
);
ALTER TABLE public.talent_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers can manage their blocks" ON public.talent_blocks
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      JOIN public.employees e ON e.id = tp.employee_id
      WHERE tp.id = talent_profile_id AND e.user_id = auth.uid()
    )
  );

-- ============================================================
-- Trigger: prevent duplicate active unlocks
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_talent_unlock_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.talent_contact_unlocks
    WHERE tenant_id = NEW.tenant_id
      AND talent_profile_id = NEW.talent_profile_id
      AND expires_at > now()
      AND candidate_response NOT IN ('blocked', 'rejected')
  ) THEN
    RAISE EXCEPTION 'Active unlock already exists for this tenant and candidate';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_talent_unlock_insert
  BEFORE INSERT ON public.talent_contact_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.validate_talent_unlock_insert();

-- ============================================================
-- RPC: Purchase credits
-- ============================================================
CREATE OR REPLACE FUNCTION public.purchase_talent_credits(_pack_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _tenant_id uuid;
  _pack RECORD;
  _purchase_id uuid;
  _wallet_balance integer;
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

  INSERT INTO public.talent_credit_purchases (
    tenant_id, pack_id, credits_purchased, credits_remaining,
    price_paid, price_currency, purchased_by, expires_at, status
  ) VALUES (
    _tenant_id, _pack_id, _pack.credits, _pack.credits,
    _pack.price_amount, _pack.price_currency, _user_id,
    now() + (_pack.validity_days || ' days')::interval, 'active'
  ) RETURNING id INTO _purchase_id;

  INSERT INTO public.talent_credit_wallets (tenant_id, balance)
  VALUES (_tenant_id, _pack.credits)
  ON CONFLICT (tenant_id) DO UPDATE
  SET balance = talent_credit_wallets.balance + _pack.credits, updated_at = now();

  SELECT balance INTO _wallet_balance FROM public.talent_credit_wallets WHERE tenant_id = _tenant_id;

  RETURN jsonb_build_object(
    'purchase_id', _purchase_id,
    'credits_added', _pack.credits,
    'wallet_balance', _wallet_balance
  );
END;
$$;

-- ============================================================
-- RPC: Unlock outbound contact
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_talent_contact(
  _talent_profile_id uuid,
  _intro_message text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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
    AND expires_at > now() AND candidate_response NOT IN ('blocked', 'rejected')
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
  WHERE tenant_id = _tenant_id AND status = 'active' AND credits_remaining > 0 AND expires_at > now()
  ORDER BY created_at ASC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'no_credits', 'balance', 0);
  END IF;

  _validity_days := (SELECT validity_days FROM public.talent_credit_packs WHERE id = _oldest_purchase.pack_id);

  UPDATE public.talent_credit_purchases
  SET credits_remaining = credits_remaining - 1
  WHERE id = _oldest_purchase.id;

  UPDATE public.talent_credit_wallets
  SET balance = balance - 1, updated_at = now()
  WHERE tenant_id = _tenant_id;

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
    'credits_remaining', _wallet.balance - 1
  );
END;
$$;

-- ============================================================
-- RPC: Candidate responds to contact request
-- ============================================================
CREATE OR REPLACE FUNCTION public.respond_to_contact_request(
  _unlock_id uuid,
  _response text,
  _block_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _unlock RECORD;
  _is_owner boolean;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _unlock FROM public.talent_contact_unlocks WHERE id = _unlock_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contact request not found'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.talent_profiles tp
    JOIN public.employees e ON e.id = tp.employee_id
    WHERE tp.id = _unlock.talent_profile_id AND e.user_id = _user_id
  ) INTO _is_owner;
  IF NOT _is_owner THEN RAISE EXCEPTION 'Not your contact request'; END IF;

  IF _unlock.candidate_response != 'pending' THEN
    RAISE EXCEPTION 'Already responded';
  END IF;

  IF _response NOT IN ('accepted', 'ignored', 'blocked', 'reported') THEN
    RAISE EXCEPTION 'Invalid response: %', _response;
  END IF;

  UPDATE public.talent_contact_unlocks
  SET candidate_response = _response,
      candidate_responded_at = now(),
      blocked_at = CASE WHEN _response IN ('blocked', 'reported') THEN now() ELSE NULL END
  WHERE id = _unlock_id;

  IF _response = 'accepted' AND _unlock.conversation_id IS NOT NULL THEN
    UPDATE public.talent_conversations SET status = 'active' WHERE id = _unlock.conversation_id;
  END IF;

  IF _response IN ('blocked', 'reported') THEN
    INSERT INTO public.talent_blocks (talent_profile_id, blocked_tenant_id, reason)
    VALUES (_unlock.talent_profile_id, _unlock.tenant_id, _block_reason)
    ON CONFLICT (talent_profile_id, blocked_tenant_id) DO NOTHING;
    IF _unlock.conversation_id IS NOT NULL THEN
      UPDATE public.talent_conversations SET status = 'blocked' WHERE id = _unlock.conversation_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('status', _response);
END;
$$;
