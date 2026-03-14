
-- Shift marketplace listings
CREATE TABLE public.shift_marketplace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  offered_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  listing_type text NOT NULL DEFAULT 'offer' CHECK (listing_type IN ('offer', 'open_shift', 'swap')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'cancelled', 'expired')),
  swap_target_shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shift_id, status) -- only one active listing per shift
);

ALTER TABLE public.shift_marketplace ENABLE ROW LEVEL SECURITY;

-- Staff can view marketplace listings in their tenant
CREATE POLICY "Tenant members can view marketplace" ON public.shift_marketplace
  FOR SELECT TO authenticated USING (is_tenant_member(tenant_id));

-- Staff can insert (offer their own shifts)
CREATE POLICY "Staff can offer own shifts" ON public.shift_marketplace
  FOR INSERT TO authenticated
  WITH CHECK (
    is_tenant_member(tenant_id)
    AND (
      listing_type = 'offer'
      AND offered_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
  );

-- Managers can manage all listings
CREATE POLICY "Managers can manage marketplace" ON public.shift_marketplace
  FOR ALL TO authenticated
  USING (is_tenant_manager_or_above(tenant_id))
  WITH CHECK (is_tenant_manager_or_above(tenant_id));

-- Staff can cancel own listings
CREATE POLICY "Staff can cancel own listings" ON public.shift_marketplace
  FOR UPDATE TO authenticated
  USING (
    is_tenant_member(tenant_id)
    AND offered_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
  WITH CHECK (
    is_tenant_member(tenant_id)
    AND offered_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Shift marketplace requests
CREATE TABLE public.shift_marketplace_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.shift_marketplace(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_marketplace_requests ENABLE ROW LEVEL SECURITY;

-- Staff can view own requests
CREATE POLICY "Staff can view own requests" ON public.shift_marketplace_requests
  FOR SELECT TO authenticated
  USING (
    is_tenant_member(tenant_id)
    AND requested_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Staff can create requests
CREATE POLICY "Staff can create requests" ON public.shift_marketplace_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    is_tenant_member(tenant_id)
    AND requested_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Staff can withdraw own requests
CREATE POLICY "Staff can withdraw own requests" ON public.shift_marketplace_requests
  FOR UPDATE TO authenticated
  USING (
    is_tenant_member(tenant_id)
    AND requested_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
  WITH CHECK (
    is_tenant_member(tenant_id)
    AND requested_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Managers can manage all requests
CREATE POLICY "Managers can manage marketplace requests" ON public.shift_marketplace_requests
  FOR ALL TO authenticated
  USING (is_tenant_manager_or_above(tenant_id))
  WITH CHECK (is_tenant_manager_or_above(tenant_id));
