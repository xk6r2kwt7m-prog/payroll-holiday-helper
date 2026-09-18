CREATE TABLE public.alcohol_list_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  branch TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('front_of_house', 'not_front_of_house')),
  note TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, employee_id, branch)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alcohol_list_decisions TO authenticated;
GRANT ALL ON public.alcohol_list_decisions TO service_role;

ALTER TABLE public.alcohol_list_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read alcohol list decisions"
ON public.alcohol_list_decisions FOR SELECT TO authenticated
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Tenant admins manage alcohol list decisions"
ON public.alcohol_list_decisions FOR ALL TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE INDEX idx_alcohol_list_decisions_tenant_branch
ON public.alcohol_list_decisions (tenant_id, branch);