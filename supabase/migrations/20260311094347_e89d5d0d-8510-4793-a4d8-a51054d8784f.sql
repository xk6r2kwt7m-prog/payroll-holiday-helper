
-- Phase 2c: Rewrite ALL RLS policies to use tenant-scoped security functions
-- This replaces is_admin(), is_manager_or_above(), is_supervisor_or_above(), has_any_role()
-- with is_tenant_admin(tenant_id), is_tenant_manager_or_above(tenant_id), etc.

-- ============================================================
-- 1. EMPLOYEES
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Only admins can view employees" ON public.employees;
DROP POLICY IF EXISTS "Managers and supervisors can view employees" ON public.employees;

CREATE POLICY "Tenant admins can manage employees"
  ON public.employees FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant supervisors can view employees"
  ON public.employees FOR SELECT TO authenticated
  USING (is_tenant_supervisor_or_above(tenant_id));

-- ============================================================
-- 2. PAYROLL_PERIODS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage payroll periods" ON public.payroll_periods;
DROP POLICY IF EXISTS "Only admins can view payroll periods" ON public.payroll_periods;

CREATE POLICY "Tenant admins can manage payroll periods"
  ON public.payroll_periods FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 3. PAYROLL_ENTRIES
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage payroll entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Only admins can view payroll entries" ON public.payroll_entries;

CREATE POLICY "Tenant admins can manage payroll entries"
  ON public.payroll_entries FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 4. PAYROLL_IMPORTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage imports" ON public.payroll_imports;
DROP POLICY IF EXISTS "Only admins can view imports" ON public.payroll_imports;

CREATE POLICY "Tenant admins can manage imports"
  ON public.payroll_imports FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 5. PAYROLL_OVERPAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage overpayments" ON public.payroll_overpayments;
DROP POLICY IF EXISTS "Only admins can view overpayments" ON public.payroll_overpayments;

CREATE POLICY "Tenant admins can manage overpayments"
  ON public.payroll_overpayments FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 6. HOLIDAY_PAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage holiday payments" ON public.holiday_payments;
DROP POLICY IF EXISTS "Only admins can view holiday payments" ON public.holiday_payments;

CREATE POLICY "Tenant admins can manage holiday payments"
  ON public.holiday_payments FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 7. HOLIDAY_BALANCES
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage holiday balances" ON public.holiday_balances;
DROP POLICY IF EXISTS "Only admins can view holiday balances" ON public.holiday_balances;
DROP POLICY IF EXISTS "Managers can view holiday balances" ON public.holiday_balances;

CREATE POLICY "Tenant admins can manage holiday balances"
  ON public.holiday_balances FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view holiday balances"
  ON public.holiday_balances FOR SELECT TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

-- ============================================================
-- 8. HOLIDAY_ADJUSTMENTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage holiday adjustments" ON public.holiday_adjustments;
DROP POLICY IF EXISTS "Only admins can view holiday adjustments" ON public.holiday_adjustments;
DROP POLICY IF EXISTS "Managers can view holiday adjustments" ON public.holiday_adjustments;

CREATE POLICY "Tenant admins can manage holiday adjustments"
  ON public.holiday_adjustments FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view holiday adjustments"
  ON public.holiday_adjustments FOR SELECT TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

-- ============================================================
-- 9. SHIFTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "Managers can manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "Supervisors can view shifts" ON public.shifts;
DROP POLICY IF EXISTS "Staff can view own published shifts" ON public.shifts;

CREATE POLICY "Tenant admins can manage shifts"
  ON public.shifts FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can manage shifts"
  ON public.shifts FOR ALL TO authenticated
  USING (is_tenant_manager_or_above(tenant_id))
  WITH CHECK (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant supervisors can view shifts"
  ON public.shifts FOR SELECT TO authenticated
  USING (is_tenant_supervisor_or_above(tenant_id));

CREATE POLICY "Staff can view own published shifts"
  ON public.shifts FOR SELECT TO authenticated
  USING (
    is_tenant_member(tenant_id)
    AND is_published = true
    AND employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 10. ABSENCE_RECORDS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage absence records" ON public.absence_records;
DROP POLICY IF EXISTS "Only admins can view absence records" ON public.absence_records;
DROP POLICY IF EXISTS "Managers can view absence records" ON public.absence_records;

CREATE POLICY "Tenant admins can manage absence records"
  ON public.absence_records FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view absence records"
  ON public.absence_records FOR SELECT TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

-- ============================================================
-- 11. RETURN_TO_WORK_FORMS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage RTW forms" ON public.return_to_work_forms;
DROP POLICY IF EXISTS "Only admins can view RTW forms" ON public.return_to_work_forms;

CREATE POLICY "Tenant admins can manage RTW forms"
  ON public.return_to_work_forms FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 12. ADMIN_NOTES
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage admin notes" ON public.admin_notes;
DROP POLICY IF EXISTS "Only admins can view admin notes" ON public.admin_notes;

CREATE POLICY "Tenant admins can manage admin notes"
  ON public.admin_notes FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 13. EMPLOYEE_DOCUMENTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage employee documents" ON public.employee_documents;
DROP POLICY IF EXISTS "Only admins can view employee documents" ON public.employee_documents;

CREATE POLICY "Tenant admins can manage employee documents"
  ON public.employee_documents FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 14. EMPLOYEE_CHANGES
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage employee changes" ON public.employee_changes;
DROP POLICY IF EXISTS "Only admins can view employee changes" ON public.employee_changes;

CREATE POLICY "Tenant admins can manage employee changes"
  ON public.employee_changes FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 15. EMPLOYEE_BRANCHES
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage employee branches" ON public.employee_branches;
DROP POLICY IF EXISTS "Only admins can view employee branches" ON public.employee_branches;

CREATE POLICY "Tenant admins can manage employee branches"
  ON public.employee_branches FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant members can view employee branches"
  ON public.employee_branches FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

-- ============================================================
-- 16. CONTRACT_SIGNATURES
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage contract signatures" ON public.contract_signatures;
DROP POLICY IF EXISTS "Only admins can view contract signatures" ON public.contract_signatures;

CREATE POLICY "Tenant admins can manage contract signatures"
  ON public.contract_signatures FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 17. DISCIPLINARY_RECORDS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage disciplinary records" ON public.disciplinary_records;
DROP POLICY IF EXISTS "Only admins can view disciplinary records" ON public.disciplinary_records;

CREATE POLICY "Tenant admins can manage disciplinary records"
  ON public.disciplinary_records FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 18. TRAINING_RECORDS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage training records" ON public.training_records;
DROP POLICY IF EXISTS "Only admins can view training records" ON public.training_records;
DROP POLICY IF EXISTS "Managers can manage training records" ON public.training_records;
DROP POLICY IF EXISTS "Managers can view training records" ON public.training_records;

CREATE POLICY "Tenant admins can manage training records"
  ON public.training_records FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view training records"
  ON public.training_records FOR SELECT TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

-- ============================================================
-- 19. ONBOARDING_TEMPLATES
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage onboarding templates" ON public.onboarding_templates;
DROP POLICY IF EXISTS "Only admins can view onboarding templates" ON public.onboarding_templates;
DROP POLICY IF EXISTS "Managers can view onboarding templates" ON public.onboarding_templates;

CREATE POLICY "Tenant admins can manage onboarding templates"
  ON public.onboarding_templates FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view onboarding templates"
  ON public.onboarding_templates FOR SELECT TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

-- ============================================================
-- 20. ONBOARDING_PROGRESS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Only admins can view onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Managers can view onboarding progress" ON public.onboarding_progress;

CREATE POLICY "Tenant admins can manage onboarding progress"
  ON public.onboarding_progress FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can view onboarding progress"
  ON public.onboarding_progress FOR SELECT TO authenticated
  USING (is_tenant_manager_or_above(tenant_id));

-- ============================================================
-- 21. SCHEDULE_TEMPLATES
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage schedule templates" ON public.schedule_templates;

CREATE POLICY "Tenant admins can manage schedule templates"
  ON public.schedule_templates FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 22. SCHEDULE_TEMPLATE_SHIFTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage template shifts" ON public.schedule_template_shifts;

CREATE POLICY "Tenant admins can manage template shifts"
  ON public.schedule_template_shifts FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 23. COMPANY_SETTINGS
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can view settings" ON public.company_settings;

CREATE POLICY "Tenant admins can manage settings"
  ON public.company_settings FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant members can view settings"
  ON public.company_settings FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

-- ============================================================
-- 24. BRANCH_LOCATIONS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage branch locations" ON public.branch_locations;
DROP POLICY IF EXISTS "Staff can view branch locations" ON public.branch_locations;

CREATE POLICY "Tenant admins can manage branch locations"
  ON public.branch_locations FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant members can view branch locations"
  ON public.branch_locations FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

-- ============================================================
-- 25. LOCATION_SETTINGS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage location settings" ON public.location_settings;
DROP POLICY IF EXISTS "Staff can view location settings" ON public.location_settings;

CREATE POLICY "Tenant admins can manage location settings"
  ON public.location_settings FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant members can view location settings"
  ON public.location_settings FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id));

-- ============================================================
-- 26. STAFF_ANNOUNCEMENTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.staff_announcements;
DROP POLICY IF EXISTS "Managers can manage announcements" ON public.staff_announcements;
DROP POLICY IF EXISTS "Staff can view published announcements" ON public.staff_announcements;

CREATE POLICY "Tenant admins can manage announcements"
  ON public.staff_announcements FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant managers can manage announcements"
  ON public.staff_announcements FOR ALL TO authenticated
  USING (is_tenant_manager_or_above(tenant_id))
  WITH CHECK (is_tenant_manager_or_above(tenant_id));

CREATE POLICY "Tenant staff can view published announcements"
  ON public.staff_announcements FOR SELECT TO authenticated
  USING (
    is_tenant_member(tenant_id)
    AND published_at IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  );

-- ============================================================
-- 27. ANNOUNCEMENT_READ_RECEIPTS
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage read receipts" ON public.announcement_read_receipts;
DROP POLICY IF EXISTS "Staff can insert own read receipts" ON public.announcement_read_receipts;
DROP POLICY IF EXISTS "Staff can view own read receipts" ON public.announcement_read_receipts;

CREATE POLICY "Tenant admins can manage read receipts"
  ON public.announcement_read_receipts FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant staff can insert own read receipts"
  ON public.announcement_read_receipts FOR INSERT TO authenticated
  WITH CHECK (
    is_tenant_member(tenant_id)
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenant staff can view own read receipts"
  ON public.announcement_read_receipts FOR SELECT TO authenticated
  USING (
    is_tenant_member(tenant_id)
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ============================================================
-- 28. USER_ROLES (tenant-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Tenant admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 29. AUDIT_LOG (tenant-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;

CREATE POLICY "Tenant admins can insert audit log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins can view audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (is_tenant_admin(tenant_id));

-- ============================================================
-- 30. SIGNING_TOKENS (tenant-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage signing tokens" ON public.signing_tokens;

CREATE POLICY "Tenant admins can manage signing tokens"
  ON public.signing_tokens FOR ALL TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- ============================================================
-- 31. PROFILES - keep user-scoped (not tenant-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Platform admins + tenant admins can view profiles of members in their tenant
CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_platform_admin());
