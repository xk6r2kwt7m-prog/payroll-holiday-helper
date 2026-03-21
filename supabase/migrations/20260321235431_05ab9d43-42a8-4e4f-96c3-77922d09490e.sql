
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS manager_adjusted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adjustment_reason text,
  ADD COLUMN IF NOT EXISTS adjusted_by uuid;
