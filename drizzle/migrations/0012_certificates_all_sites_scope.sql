-- Staff qualifications (e.g. Level 2 Food Safety) belong to the person, not one
-- site, so a certificate can be marked as visible at every location.
ALTER TABLE public.compliance_certificates
  ADD COLUMN IF NOT EXISTS applies_to_all_branches boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS holder_job_title text;

CREATE INDEX IF NOT EXISTS compliance_certificates_all_branches_idx
  ON public.compliance_certificates (tenant_id, applies_to_all_branches);

CREATE INDEX IF NOT EXISTS compliance_certificates_employee_idx
  ON public.compliance_certificates (tenant_id, employee_id);
