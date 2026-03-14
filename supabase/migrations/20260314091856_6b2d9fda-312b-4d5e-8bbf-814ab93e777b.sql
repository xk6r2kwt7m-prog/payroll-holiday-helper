
-- Document Requests table
CREATE TABLE public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requested_by uuid,
  document_type text NOT NULL DEFAULT 'other',
  request_title text NOT NULL,
  request_description text,
  due_date date,
  priority text NOT NULL DEFAULT 'normal',
  requires_verification boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'requested',
  fulfilled_document_id uuid REFERENCES public.employee_documents(id),
  rejection_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  verified_at timestamptz,
  viewed_at timestamptz,
  cancelled_at timestamptz
);

-- Indexes
CREATE INDEX idx_document_requests_tenant ON public.document_requests(tenant_id);
CREATE INDEX idx_document_requests_employee ON public.document_requests(employee_id);
CREATE INDEX idx_document_requests_status ON public.document_requests(status);
CREATE INDEX idx_document_requests_due_date ON public.document_requests(due_date);

-- RLS
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Tenant admins can manage document requests"
ON public.document_requests FOR ALL TO authenticated
USING (is_tenant_admin(tenant_id))
WITH CHECK (is_tenant_admin(tenant_id));

-- Managers can manage
CREATE POLICY "Tenant managers can manage document requests"
ON public.document_requests FOR ALL TO authenticated
USING (is_tenant_manager_or_above(tenant_id))
WITH CHECK (is_tenant_manager_or_above(tenant_id));

-- Employees can view own requests
CREATE POLICY "Employees can view own document requests"
ON public.document_requests FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = document_requests.employee_id AND e.user_id = auth.uid()
));

-- Employees can update own requests (for marking as viewed, uploading)
CREATE POLICY "Employees can update own document requests"
ON public.document_requests FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = document_requests.employee_id AND e.user_id = auth.uid()
));

-- Document request audit log
CREATE TABLE public.document_request_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  request_id uuid NOT NULL REFERENCES public.document_requests(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  performed_by uuid,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_request_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view request audit"
ON public.document_request_audit FOR SELECT TO authenticated
USING (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant members can insert request audit"
ON public.document_request_audit FOR INSERT TO authenticated
WITH CHECK (is_tenant_member(tenant_id));

-- Document request templates
CREATE TABLE public.document_request_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  template_name text NOT NULL,
  description text,
  applies_to_departments text[] DEFAULT '{}',
  applies_to_locations text[] DEFAULT '{}',
  applies_to_countries text[] DEFAULT '{}',
  request_items jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_request_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage request templates"
ON public.document_request_templates FOR ALL TO authenticated
USING (is_tenant_admin(tenant_id))
WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view request templates"
ON public.document_request_templates FOR SELECT TO authenticated
USING (is_tenant_manager_or_above(tenant_id));
