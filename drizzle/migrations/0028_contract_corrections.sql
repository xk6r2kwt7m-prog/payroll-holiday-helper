-- Dated corrections recorded against a signed contract.
-- The signed file itself is never touched; this is the written record of a
-- correction (e.g. a misspelled name) kept alongside it for the audit trail.
CREATE TABLE IF NOT EXISTS public.contract_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  contract_id uuid NOT NULL REFERENCES public.employee_documents(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  field text NOT NULL,
  label text NOT NULL,
  previous_value text,
  new_value text,
  reason text NOT NULL,
  corrected_on date NOT NULL DEFAULT CURRENT_DATE,
  corrected_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.contract_corrections TO authenticated;
GRANT ALL ON public.contract_corrections TO service_role;

ALTER TABLE public.contract_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins read corrections" ON public.contract_corrections
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins record corrections" ON public.contract_corrections
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id) AND corrected_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_contract_corrections_contract
  ON public.contract_corrections(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_corrections_tenant
  ON public.contract_corrections(tenant_id);

-- Corrections are a permanent record: no updates, no deletions.
CREATE OR REPLACE FUNCTION public.protect_contract_corrections()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Contract corrections are permanent and cannot be % once recorded.', lower(TG_OP);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_contract_corrections ON public.contract_corrections;
CREATE TRIGGER trg_protect_contract_corrections
  BEFORE UPDATE OR DELETE ON public.contract_corrections
  FOR EACH ROW EXECUTE FUNCTION public.protect_contract_corrections();