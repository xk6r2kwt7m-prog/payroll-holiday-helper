
-- ═══════════════════════════════════════════════════════
-- IN-APP NOTIFICATIONS TABLE
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_tenant ON public.notifications(tenant_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tenant admins and managers can insert notifications for their tenant
CREATE POLICY "Tenant admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_tenant_member(tenant_id));

-- Tenant admins can manage all notifications in their tenant
CREATE POLICY "Tenant admins can manage notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ═══════════════════════════════════════════════════════
-- HOLIDAY REQUESTS TABLE (for staff self-service)
-- ═══════════════════════════════════════════════════════

CREATE TABLE public.holiday_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  hours_requested numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_holiday_requests_employee ON public.holiday_requests(employee_id, status);
CREATE INDEX idx_holiday_requests_tenant ON public.holiday_requests(tenant_id, status);

ALTER TABLE public.holiday_requests ENABLE ROW LEVEL SECURITY;

-- Staff can view their own requests
CREATE POLICY "Staff can view own holiday requests"
  ON public.holiday_requests FOR SELECT
  TO authenticated
  USING (
    is_tenant_member(tenant_id) AND
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Staff can insert their own requests
CREATE POLICY "Staff can submit holiday requests"
  ON public.holiday_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    is_tenant_member(tenant_id) AND
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Managers and admins can view all requests
CREATE POLICY "Managers can view all holiday requests"
  ON public.holiday_requests FOR SELECT
  TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

-- Admins can manage all requests
CREATE POLICY "Admins can manage holiday requests"
  ON public.holiday_requests FOR ALL
  TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- Managers can update (approve/reject) requests
CREATE POLICY "Managers can update holiday requests"
  ON public.holiday_requests FOR UPDATE
  TO authenticated
  USING (is_tenant_manager_or_above(tenant_id))
  WITH CHECK (is_tenant_manager_or_above(tenant_id));
