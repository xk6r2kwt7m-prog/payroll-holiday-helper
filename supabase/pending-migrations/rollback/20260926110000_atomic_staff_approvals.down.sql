-- RECOVERY ONLY. Reverses 20260926110000_atomic_staff_approvals.sql, restoring the exact live grants of 26 Sep 2026.
-- Decisions, bank verifications and audit rows already written are kept.
BEGIN;
DROP FUNCTION IF EXISTS public.confirm_staff_bank_atomic(uuid[],text,text);
DROP FUNCTION IF EXISTS public.decide_staff_detail_atomic(uuid,boolean,text,text);
DROP FUNCTION IF EXISTS public.staff_review_role(uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_detail_changes, public.bank_detail_verifications TO anon, authenticated;
COMMIT;
