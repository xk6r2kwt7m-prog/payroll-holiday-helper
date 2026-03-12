
-- Evidence requests table
CREATE TABLE public.evidence_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_by uuid,
  request_type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  description text,
  due_date date,
  related_date date,
  related_time_entry_id uuid REFERENCES public.time_entries(id),
  related_absence_id uuid REFERENCES public.absence_records(id),
  status text NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage evidence requests"
  ON public.evidence_requests FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can manage evidence requests"
  ON public.evidence_requests FOR ALL TO authenticated
  USING (is_tenant_manager_or_above(tenant_id))
  WITH CHECK (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Staff can view own evidence requests"
  ON public.evidence_requests FOR SELECT TO authenticated
  USING (
    is_tenant_member(tenant_id) AND
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- Evidence files table
CREATE TABLE public.evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.evidence_requests(id),
  file_type text NOT NULL DEFAULT 'other',
  file_path text NOT NULL,
  original_filename text NOT NULL,
  file_size integer,
  mime_type text,
  related_date date,
  notes text,
  review_status text NOT NULL DEFAULT 'pending_review',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage evidence files"
  ON public.evidence_files FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view evidence files"
  ON public.evidence_files FOR SELECT TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Staff can manage own evidence files"
  ON public.evidence_files FOR ALL TO authenticated
  USING (
    is_tenant_member(tenant_id) AND
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
  WITH CHECK (
    is_tenant_member(tenant_id) AND
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- Timesheet review actions log
CREATE TABLE public.timesheet_review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timesheet_review_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage review actions"
  ON public.timesheet_review_actions FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can manage review actions"
  ON public.timesheet_review_actions FOR ALL TO authenticated
  USING (is_tenant_manager_or_above(tenant_id))
  WITH CHECK (is_tenant_manager_or_above(tenant_id));

-- Evidence storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-files', 'evidence-files', false);

-- Storage RLS for evidence files
CREATE POLICY "Tenant admins can manage evidence storage"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'evidence-files')
  WITH CHECK (bucket_id = 'evidence-files');
