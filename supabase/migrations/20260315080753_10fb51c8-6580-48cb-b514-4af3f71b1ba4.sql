
-- =============================================================
-- Privacy remediation: Remove previous_employer_only, add archival safeguard
-- =============================================================

-- 1. Migrate existing 'previous_employer_only' profiles to 'hidden'
-- REVERSIBLE: To undo, UPDATE talent_profiles SET visibility_mode = 'previous_employer_only' WHERE visibility_mode = 'hidden' AND updated_at > NOW() - INTERVAL '1 hour';
UPDATE public.talent_profiles
SET visibility_mode = 'hidden'
WHERE visibility_mode = 'previous_employer_only';

-- 2. Add a trigger to prevent user_id nullification on employees
-- when an active talent profile exists. This preserves self-service
-- access for ex-employees in the marketplace.
CREATE OR REPLACE FUNCTION public.protect_talent_user_link()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Only fires when user_id is being set to NULL from a non-NULL value
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.talent_profiles
      WHERE employee_id = OLD.id
        AND talent_pool_status IN ('open_to_work', 'available_now', 'available_from_date')
    ) THEN
      RAISE EXCEPTION 'Cannot remove user_id from employee % — they have an active talent pool profile. Opt them out first.', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_talent_user_link
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  WHEN (OLD.user_id IS NOT NULL AND NEW.user_id IS NULL)
  EXECUTE FUNCTION public.protect_talent_user_link();
