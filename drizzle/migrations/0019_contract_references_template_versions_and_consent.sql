-- Priority 2/3: contract references, template versioning, terms snapshot,
-- signatory email verification, legacy labelling. Additive only.

ALTER TABLE public.employee_documents
  ADD COLUMN IF NOT EXISTS contract_reference text,
  ADD COLUMN IF NOT EXISTS template_version text,
  ADD COLUMN IF NOT EXISTS terms_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS legacy_origin_note text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_documents_contract_reference
  ON public.employee_documents(tenant_id, contract_reference)
  WHERE contract_reference IS NOT NULL;

ALTER TABLE public.contract_signatures
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_items jsonb;

-- Sequential contract references per company, never reused.
CREATE TABLE IF NOT EXISTS public.contract_reference_counters (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, year)
);

GRANT SELECT ON public.contract_reference_counters TO authenticated;
GRANT ALL ON public.contract_reference_counters TO service_role;
ALTER TABLE public.contract_reference_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins read contract reference counters"
ON public.contract_reference_counters FOR SELECT TO authenticated
USING (public.is_tenant_admin(tenant_id));

CREATE OR REPLACE FUNCTION public.allocate_contract_reference(_tenant_id uuid, _prefix text DEFAULT 'UD-EC')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year integer := EXTRACT(YEAR FROM now())::integer;
  _next integer;
BEGIN
  INSERT INTO public.contract_reference_counters (tenant_id, year, last_number)
  VALUES (_tenant_id, _year, 1)
  ON CONFLICT (tenant_id, year)
  DO UPDATE SET last_number = public.contract_reference_counters.last_number + 1
  RETURNING last_number INTO _next;

  RETURN _prefix || '-' || _year::text || '-' || lpad(_next::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_contract_reference(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_contract_reference(uuid, text) TO authenticated, service_role;

-- Numbered, dated wording releases. Earlier versions are never altered or removed.
CREATE TABLE IF NOT EXISTS public.contract_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  version text NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  clause_text jsonb NOT NULL,
  checksum text NOT NULL,
  notes text,
  published_by uuid REFERENCES auth.users(id),
  published_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, version)
);

GRANT SELECT, INSERT ON public.contract_template_versions TO authenticated;
GRANT ALL ON public.contract_template_versions TO service_role;
ALTER TABLE public.contract_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins read contract template versions"
ON public.contract_template_versions FOR SELECT TO authenticated
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Tenant admins publish contract template versions"
ON public.contract_template_versions FOR INSERT TO authenticated
WITH CHECK (public.is_tenant_admin(tenant_id));

-- Locked contracts: permit only first-time record-level labelling (reference, legacy note).
CREATE OR REPLACE FUNCTION public.protect_locked_contracts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _old_rest jsonb;
  _new_rest jsonb;
BEGIN
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

  IF OLD.contract_state = 'signed' THEN
    IF NEW.contract_state = 'superseded' AND NEW.superseded_by IS NOT NULL AND OLD.superseded_by IS NULL THEN
      IF NEW.file_path IS DISTINCT FROM OLD.file_path
         OR NEW.final_signed_pdf_url IS DISTINCT FROM OLD.final_signed_pdf_url
         OR NEW.final_document_hash IS DISTINCT FROM OLD.final_document_hash
         OR NEW.terms_snapshot IS DISTINCT FROM OLD.terms_snapshot
         OR NEW.extracted_data IS DISTINCT FROM OLD.extracted_data THEN
        RAISE EXCEPTION 'Cannot modify immutable fields on a signed contract.';
      END IF;
      RETURN NEW;
    ELSIF NEW.contract_state = 'terminated' AND NEW.terminated_at IS NOT NULL AND OLD.terminated_at IS NULL THEN
      IF NEW.file_path IS DISTINCT FROM OLD.file_path
         OR NEW.final_signed_pdf_url IS DISTINCT FROM OLD.final_signed_pdf_url
         OR NEW.final_document_hash IS DISTINCT FROM OLD.final_document_hash
         OR NEW.terms_snapshot IS DISTINCT FROM OLD.terms_snapshot THEN
        RAISE EXCEPTION 'Cannot modify immutable fields on a signed contract.';
      END IF;
      RETURN NEW;
    END IF;

    -- Record-level labelling only: a reference or legacy note may be set once.
    _old_rest := (to_jsonb(OLD) - 'contract_reference' - 'legacy_origin_note' - 'updated_at');
    _new_rest := (to_jsonb(NEW) - 'contract_reference' - 'legacy_origin_note' - 'updated_at');

    IF _old_rest = _new_rest
       AND (OLD.contract_reference IS NULL OR NEW.contract_reference IS NOT DISTINCT FROM OLD.contract_reference)
       AND (OLD.legacy_origin_note IS NULL OR NEW.legacy_origin_note IS NOT DISTINCT FROM OLD.legacy_origin_note) THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Contract is signed and locked. Create an amendment to make changes.';
  END IF;

  IF OLD.contract_state IN ('superseded','terminated') THEN
    IF NEW.contract_state IS DISTINCT FROM OLD.contract_state
       OR NEW.file_path IS DISTINCT FROM OLD.file_path
       OR NEW.final_signed_pdf_url IS DISTINCT FROM OLD.final_signed_pdf_url
       OR NEW.final_document_hash IS DISTINCT FROM OLD.final_document_hash
       OR NEW.terms_snapshot IS DISTINCT FROM OLD.terms_snapshot
       OR NEW.extracted_data IS DISTINCT FROM OLD.extracted_data THEN
      RAISE EXCEPTION 'Contract is % and is read-only.', OLD.contract_state;
    END IF;

    IF OLD.contract_reference IS NOT NULL AND NEW.contract_reference IS DISTINCT FROM OLD.contract_reference THEN
      RAISE EXCEPTION 'The contract reference cannot be changed once assigned.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Staff may read only their own completed contract and its signatures.
CREATE POLICY "Staff read their own completed contracts"
ON public.employee_documents FOR SELECT TO authenticated
USING (
  document_type::text = 'contract'
  AND contract_state IN ('signed','superseded','terminated')
  AND EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_documents.employee_id
      AND e.user_id = auth.uid()
      AND e.status <> 'leaver'
  )
);

CREATE POLICY "Staff read signatures on their own completed contracts"
ON public.contract_signatures FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.employee_documents d
    JOIN public.employees e ON e.id = d.employee_id
    WHERE d.id = contract_signatures.employee_document_id
      AND d.contract_state IN ('signed','superseded','terminated')
      AND e.user_id = auth.uid()
      AND e.status <> 'leaver'
  )
);