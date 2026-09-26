-- RECOVERY ONLY. Reverses 20260926150000_payroll_period_archive.
-- Removes the read-only protection. Keeps payroll_period_archives (with its immutability trigger)
-- and every audit row as evidence of what was archived and when. No period, entry, payment,
-- ledger or overpayment row is changed by this script.
BEGIN;
DROP TRIGGER IF EXISTS a0_guard_archived_payroll_period ON public.payroll_periods;
DROP TRIGGER IF EXISTS a0_guard_archived_payroll_child ON public.payroll_entries;
DROP TRIGGER IF EXISTS a0_guard_archived_payroll_child ON public.holiday_payments;
DROP TRIGGER IF EXISTS a0_guard_archived_payroll_child ON public.payroll_adjustments;
DROP TRIGGER IF EXISTS a0_guard_archived_payroll_child ON public.payroll_period_notes;
DROP TRIGGER IF EXISTS a0_guard_archived_payroll_child ON public.payroll_entry_locations;
DROP TRIGGER IF EXISTS a0_guard_archived_payroll_child ON public.payroll_nmw_audit;
DROP TRIGGER IF EXISTS a0_guard_archived_payroll_child ON public.payroll_imports;
DROP TRIGGER IF EXISTS a0_guard_archived_payroll_overpayment ON public.payroll_overpayments;
DROP TRIGGER IF EXISTS a0_guard_archived_payroll_ledger ON public.holiday_ledger;
DROP FUNCTION IF EXISTS public.archive_payroll_period(uuid,text,text,timestamptz);
DROP FUNCTION IF EXISTS public.guard_archived_payroll_period();
DROP FUNCTION IF EXISTS public.guard_archived_payroll_child();
DROP FUNCTION IF EXISTS public.guard_archived_payroll_overpayment();
DROP FUNCTION IF EXISTS public.guard_archived_payroll_ledger();
REVOKE SELECT ON public.payroll_period_archives FROM authenticated;
COMMIT;
