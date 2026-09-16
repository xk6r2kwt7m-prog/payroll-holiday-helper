CREATE TABLE public.employee_info_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  requested_fields text[] NOT NULL DEFAULT ARRAY['personal','emergency','bank','rtw'],
  recipient_email text,
  requested_by uuid,
  requested_by_name text,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  submitted_at timestamptz,
  submitted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  rtw_uploaded_count integer NOT NULL DEFAULT 0,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_info_requests_tenant ON public.employee_info_requests(tenant_id);
CREATE INDEX idx_employee_info_requests_employee ON public.employee_info_requests(employee_id);

GRANT SELECT, INSERT, UPDATE ON public.employee_info_requests TO authenticated;
GRANT ALL ON public.employee_info_requests TO service_role;

ALTER TABLE public.employee_info_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read info requests"
ON public.employee_info_requests FOR SELECT
USING (tenant_id IN (
  SELECT tenant_members.tenant_id FROM public.tenant_members
  WHERE tenant_members.user_id = auth.uid() AND tenant_members.is_active = true
));

CREATE POLICY "Tenant managers manage info requests"
ON public.employee_info_requests FOR ALL
USING (tenant_id IN (
  SELECT tenant_members.tenant_id FROM public.tenant_members
  WHERE tenant_members.user_id = auth.uid() AND tenant_members.is_active = true
    AND tenant_members.role = ANY (ARRAY['company_admin'::tenant_role, 'manager'::tenant_role])
))
WITH CHECK (tenant_id IN (
  SELECT tenant_members.tenant_id FROM public.tenant_members
  WHERE tenant_members.user_id = auth.uid() AND tenant_members.is_active = true
    AND tenant_members.role = ANY (ARRAY['company_admin'::tenant_role, 'manager'::tenant_role])
));

CREATE TRIGGER trg_employee_info_requests_updated_at
BEFORE UPDATE ON public.employee_info_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
