
-- Backfill March 2026 payroll accrual entries into holiday_ledger
-- These 39 entries were created after the initial ledger backfill
INSERT INTO holiday_ledger (
  employee_id, tenant_id, leave_year_start, entry_date, entry_type,
  hours, amount, source_table, source_id, notes, created_by
)
SELECT
  pe.employee_id,
  pe.tenant_id,
  '2026-01-01',
  pp.end_date,
  'accrual',
  pe.holiday_accrued_hours,
  NULL,
  'payroll_entries',
  pe.id,
  'Backfill: March 2026 accrual from payroll entry',
  NULL
FROM payroll_entries pe
JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
WHERE pp.period_name = 'March 2026'
  AND pe.holiday_accrued_hours > 0
  AND NOT EXISTS (
    SELECT 1 FROM holiday_ledger hl
    WHERE hl.source_table = 'payroll_entries'
      AND hl.source_id = pe.id
  );
