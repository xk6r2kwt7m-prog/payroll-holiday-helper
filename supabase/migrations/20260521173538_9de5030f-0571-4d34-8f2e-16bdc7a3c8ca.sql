
-- 1. Add lifecycle + versioning columns to employee_documents
ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS contract_state text,
  ADD COLUMN IF NOT EXISTS version_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_contract_id uuid REFERENCES public.employee_documents(id),
  ADD COLUMN IF NOT EXISTS root_contract_id uuid REFERENCES public.employee_documents(id),
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.employee_documents(id),
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS amendment_type text,
  ADD COLUMN IF NOT EXISTS amendment_summary text,
  ADD COLUMN IF NOT EXISTS amendment_reason text,
  ADD COLUMN IF NOT EXISTS terminated_at timestamptz,
  ADD COLUMN IF NOT EXISTS terminated_reason text;

-- Backfill contract_state for existing contract rows
UPDATE public.employee_documents
SET contract_state = CASE
  WHEN final_signed_pdf_url IS NOT NULL THEN 'signed'
  WHEN contract_send_status IN ('sent','partially_signed') THEN 'issued'
  ELSE 'draft'
END
WHERE document_type = 'contract' AND contract_state IS NULL;

-- Backfill root_contract_id = self
UPDATE public.employee_documents
SET root_contract_id = id
WHERE document_type = 'contract' AND root_contract_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_employee_documents_root_contract ON public.employee_documents(root_contract_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_parent_contract ON public.employee_documents(parent_contract_id);

-- 2. Invalidation flag on signatures (for material changes to issued-but-unsigned contracts)
ALTER TABLE public.contract_signatures
  ADD COLUMN IF NOT EXISTS invalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS invalidated_reason text;

-- 3. Amendment audit table
CREATE TABLE IF NOT EXISTS public.contract_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  previous_contract_id uuid NOT NULL REFERENCES public.employee_documents(id),
  new_contract_id uuid NOT NULL REFERENCES public.employee_documents(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amendment_type text NOT NULL,
  field_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text,
  effective_date date NOT NULL,
  requires_resignature boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  employee_resigned_at timestamptz,
  employer_resigned_at timestamptz,
  activated_at timestamptz
);

ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins manage amendments" ON public.contract_amendments;
CREATE POLICY "Tenant admins manage amendments" ON public.contract_amendments
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE INDEX IF NOT EXISTS idx_contract_amendments_tenant ON public.contract_amendments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_employee ON public.contract_amendments(employee_id);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_prev ON public.contract_amendments(previous_contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_new ON public.contract_amendments(new_contract_id);

-- 4. Lock trigger: prevent edits to signed/superseded/terminated contracts
CREATE OR REPLACE FUNCTION public.protect_locked_contracts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only applies to contracts
  IF COALESCE(OLD.document_type::text, '') <> 'contract' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.contract_state IN ('signed','superseded','terminated') THEN
      RAISE EXCEPTION 'Contract is locked (state=%) and cannot be deleted. Create an amendment or terminate instead.', OLD.contract_state;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE path
  IF OLD.contract_state = 'signed' THEN
    -- Only two allowed transitions: signed -> superseded (with superseded_by set), signed -> terminated (with terminated_at set)
    IF NEW.contract_state = 'superseded' AND NEW.superseded_by IS NOT NULL AND OLD.superseded_by IS NULL THEN
      -- allow this transition only; block edits to immutable fields
      IF NEW.file_path IS DISTINCT FROM OLD.file_path
         OR NEW.final_signed_pdf_url IS DISTINCT FROM OLD.final_signed_pdf_url
         OR NEW.final_document_hash IS DISTINCT FROM OLD.final_document_hash
         OR NEW.extracted_data IS DISTINCT FROM OLD.extracted_data THEN
        RAISE EXCEPTION 'Cannot modify immutable fields on a signed contract.';
      END IF;
      RETURN NEW;
    ELSIF NEW.contract_state = 'terminated' AND NEW.terminated_at IS NOT NULL AND OLD.terminated_at IS NULL THEN
      IF NEW.file_path IS DISTINCT FROM OLD.file_path
         OR NEW.final_signed_pdf_url IS DISTINCT FROM OLD.final_signed_pdf_url
         OR NEW.final_document_hash IS DISTINCT FROM OLD.final_document_hash THEN
        RAISE EXCEPTION 'Cannot modify immutable fields on a signed contract.';
      END IF;
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Contract is signed and locked. Create an amendment to make changes.';
    END IF;
  END IF;

  IF OLD.contract_state IN ('superseded','terminated') THEN
    -- Fully read-only
    IF NEW.contract_state IS DISTINCT FROM OLD.contract_state
       OR NEW.file_path IS DISTINCT FROM OLD.file_path
       OR NEW.final_signed_pdf_url IS DISTINCT FROM OLD.final_signed_pdf_url
       OR NEW.final_document_hash IS DISTINCT FROM OLD.final_document_hash
       OR NEW.extracted_data IS DISTINCT FROM OLD.extracted_data THEN
      RAISE EXCEPTION 'Contract is % and is read-only.', OLD.contract_state;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_locked_contracts ON public.employee_documents;
CREATE TRIGGER trg_protect_locked_contracts
  BEFORE UPDATE OR DELETE ON public.employee_documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_contracts();
