
-- =====================================================
-- PHASE 2b-3: Enforce NOT NULL + indexes on tenant_id
-- =====================================================

-- Make tenant_id NOT NULL on all tables (audit_log stays nullable for system events)
ALTER TABLE public.employees ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payroll_periods ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.company_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payroll_entries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.holiday_payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.holiday_balances ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.holiday_adjustments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shifts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.time_entries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.absence_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.return_to_work_forms ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.employee_documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.employee_branches ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.employee_changes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.contract_signatures ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.signing_tokens ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.training_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.disciplinary_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.admin_notes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.onboarding_progress ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.onboarding_templates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payroll_imports ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payroll_overpayments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.branch_locations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.location_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.schedule_templates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.schedule_template_shifts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.staff_announcements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.announcement_read_receipts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN tenant_id SET NOT NULL;

-- Add indexes for query performance on high-volume tables
CREATE INDEX idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX idx_payroll_entries_tenant ON public.payroll_entries(tenant_id);
CREATE INDEX idx_payroll_periods_tenant ON public.payroll_periods(tenant_id);
CREATE INDEX idx_holiday_payments_tenant ON public.holiday_payments(tenant_id);
CREATE INDEX idx_holiday_balances_tenant ON public.holiday_balances(tenant_id);
CREATE INDEX idx_shifts_tenant ON public.shifts(tenant_id);
CREATE INDEX idx_time_entries_tenant ON public.time_entries(tenant_id);
CREATE INDEX idx_absence_records_tenant ON public.absence_records(tenant_id);
CREATE INDEX idx_employee_documents_tenant ON public.employee_documents(tenant_id);
CREATE INDEX idx_audit_log_tenant ON public.audit_log(tenant_id);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);

-- Add unique constraint: one company_settings row per tenant
ALTER TABLE public.company_settings ADD CONSTRAINT uq_company_settings_tenant UNIQUE (tenant_id);
