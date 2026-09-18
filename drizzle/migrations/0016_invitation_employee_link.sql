ALTER TABLE public.tenant_invitations
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_employee ON public.tenant_invitations(employee_id);

-- Backfill: attach the invitation to a staff record only when exactly one
-- current (non-leaver, non-archived, non-test) record holds that email.
UPDATE public.tenant_invitations ti
SET employee_id = m.id
FROM (
  SELECT e.tenant_id, lower(e.email) AS email, min(e.id::text)::uuid AS id
  FROM public.employees e
  WHERE e.email IS NOT NULL
    AND e.archived_at IS NULL
    AND e.status <> 'leaver'
    AND coalesce(e.is_test_record, false) = false
  GROUP BY e.tenant_id, lower(e.email)
  HAVING count(*) = 1
) m
WHERE ti.employee_id IS NULL
  AND ti.tenant_id = m.tenant_id
  AND lower(ti.email) = m.email;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_invitations_one_live_per_email
  ON public.tenant_invitations(tenant_id, lower(email))
  WHERE status = 'pending';